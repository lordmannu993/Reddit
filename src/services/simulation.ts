/**
 * Simulation orchestrator.
 *
 * Owns the community registry (built-in + communities created on demand), the
 * cultural context cache, and the generation pipeline:
 *
 *   search -> live subreddit snapshot -> culture analysis -> generation
 *
 * Generation prefers a user-configured model and always falls back to the
 * built-in engine, so the feed never runs dry.
 */

import { communities as builtinCommunities } from '../data';
import type { CommunityProfile, ContextSource, CultureProfile, Post, SortOption } from '../types';
import { analyseSnapshot } from './cultureAnalysis';
import { estimatedProfile, profileFromCommunity } from './offlineProfiles';
import { generateWithModel, loadModelSettings, modelIsConfigured } from './llmClient';
import {
  ContextUnavailableError,
  fetchSubredditSnapshot,
  normalizeSubredditName,
} from './redditContext';
import { hashString, synthesizePosts } from './synthesis';

/* ------------------------------------------------------------------ */
/* Safety                                                              */
/* ------------------------------------------------------------------ */

const BLOCKED_TERMS = [
  /\bn[i1]gg(?:er|a)s?\b/i,
  /\bf[a4]gg?(?:ot|ots)?\b/i,
  /\bk[i1]ke\b/i,
  /\btr[a4]nn(?:y|ies)\b/i,
  /\bret[a4]rd(?:ed|s)?\b/i,
  /\bch[i1]nk\b/i,
  /\bsp[i1]c\b/i,
  /\bwetback\b/i,
  /\bc[u*]nt\b/i,
  /\b(?:rape|raping|molest\w*|incest|loli|shota)\b/i,
  /\b(?:cp|csam)\b/i,
  /\bkys\b/i,
  /\b(?:kill|harm)\s+(?:yourself|themselves)\b/i,
  /\bporn\w*\b/i,
  /\bnsfw\b/i,
  /\b(?:build|make)\s+a\s+(?:bomb|weapon)\b/i,
  /\bbuy now|limited offer|referral code\b/i,
];

export function isSafeText(text: string): boolean {
  return !BLOCKED_TERMS.some(pattern => pattern.test(text));
}

/** Strip unsafe vocabulary out of the signal before it can reach a template slot. */
function sanitizeProfile(profile: CultureProfile): CultureProfile {
  const safeTerm = (term: string) => Boolean(term) && isSafeText(term);
  return {
    ...profile,
    topics: profile.topics
      .map(topic => ({
        ...topic,
        terms: topic.terms.filter(safeTerm),
        entities: topic.entities.filter(safeTerm),
      }))
      .filter(topic => topic.terms.length && safeTerm(topic.label)),
    entities: profile.entities.filter(entity => safeTerm(entity.term)),
    phrases: profile.phrases.filter(phrase => safeTerm(phrase.term)),
    slang: profile.slang.filter(safeTerm),
    rising: profile.rising.filter(safeTerm),
    flairs: profile.flairs.filter(flair => safeTerm(flair.text)),
    recurringThreads: profile.recurringThreads.filter(safeTerm),
  };
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const REGISTRY_KEY = 'fora-communities-v2';
const CONTEXT_PREFIX = 'fora-ctx-v2:';
const CONTEXT_INDEX = 'fora-ctx-index-v2';
export const CONTEXT_TTL_MS = 40 * 60 * 1000;

const PALETTE: [string, string][] = [
  ['#5b5bd6', '#eeedff'],
  ['#208c74', '#e8f8f3'],
  ['#d26a31', '#fff0e6'],
  ['#a15cce', '#f6ebfc'],
  ['#157f9a', '#e6f5f8'],
  ['#e14f6d', '#fdebf0'],
  ['#1b8a5a', '#e5f7ed'],
  ['#b67842', '#f8efe7'],
  ['#2476b8', '#e7f2fa'],
  ['#b63f52', '#f9e9ec'],
  ['#7a5cd6', '#f0ecfd'],
  ['#0f8a86', '#e3f6f5'],
];

function paletteFor(name: string): [string, string] {
  return PALETTE[hashString(name.toLowerCase()) % PALETTE.length];
}

function normalizeHex(value?: string): string | null {
  if (!value) return null;
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

function softenHex(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * 0.88);
  return `#${[mix(r), mix(g), mix(b)].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

function describeTone(profile: CultureProfile): string {
  const bits: string[] = [];
  if (profile.tone.humor > 0.35) bits.push('joke-forward');
  else if (profile.tone.humor > 0.18) bits.push('lightly irreverent');
  if (profile.tone.formality > 0.62) bits.push('considered and long-form');
  else if (profile.tone.formality < 0.32) bits.push('casual and fast-moving');
  if (profile.tone.questionRate > 0.4) bits.push('question-heavy');
  if (profile.tone.lowercase > 0.4) bits.push('lowercase titles');
  if (profile.tone.spoilerRate > 0.2) bits.push('spoiler-conscious');
  return bits.length ? bits.join(', ') : 'conversational and mixed';
}

function inferCategory(profile: CultureProfile): string {
  if (profile.category) return profile.category;
  const text = `${profile.title} ${profile.description} ${profile.slang.join(' ')}`.toLowerCase();
  if (/game|gaming|rpg|console|player/.test(text)) return 'Gaming';
  if (/program|code|dev|software|linux|tech/.test(text)) return 'Technology';
  if (/film|movie|tv|series|anime|manga/.test(text)) return 'Entertainment';
  if (/food|recipe|cook|bake/.test(text)) return 'Food';
  if (/money|finance|invest|budget/.test(text)) return 'Finance';
  if (/fitness|run|lift|health/.test(text)) return 'Fitness';
  if (/art|photo|draw|design/.test(text)) return 'Art';
  if (/science|research|physics|space/.test(text)) return 'Science';
  if (/sport|team|league|match/.test(text)) return 'Sports';
  return 'Community';
}

function ruleSetFor(profile: CultureProfile): string[] {
  const rules = ['Stay on topic for this community', 'No harassment, slurs, or personal attacks'];
  if (profile.tone.spoilerRate > 0.15) rules.push('Tag spoilers in titles and comments');
  if (profile.formatMix.image > 0.35) rules.push('Credit original creators on visual posts');
  if (profile.tone.questionRate > 0.35) rules.push('Search before asking a repeat question');
  rules.push('Every post here is simulated — do not present it as real Reddit content');
  return rules.slice(0, 5);
}

export function communityFromProfile(profile: CultureProfile, existing?: CommunityProfile): CommunityProfile {
  const id = profile.subreddit.toLowerCase();
  const brand = normalizeHex(profile.primaryColor);
  const [color, colorSoft] = brand ? [brand, softenHex(brand)] : paletteFor(id);
  const topics = profile.topics.map(topic => topic.label).filter(Boolean);
  return {
    ...(existing || {}),
    id,
    name: `r/${profile.subreddit}`,
    displayName: profile.title || profile.subreddit,
    icon: (profile.subreddit[0] || 'r').toUpperCase(),
    color: existing?.color || color,
    colorSoft: existing?.colorSoft || colorSoft,
    category: inferCategory(profile),
    description: profile.description || `A simulated community inspired by r/${profile.subreddit}.`,
    members: profile.subscribers || existing?.members || 0,
    online: profile.activeUsers || existing?.online || 0,
    created: existing?.created || 'Simulated now',
    subscribed: existing?.subscribed ?? false,
    rules: existing?.rules?.length ? existing.rules : ruleSetFor(profile),
    tone: describeTone(profile),
    vocabulary: profile.slang.slice(0, 8),
    typicalUsers: existing?.typicalUsers || `People who follow r/${profile.subreddit}`,
    commonTopics: topics.length ? topics.slice(0, 6) : existing?.commonTopics || [],
    preferredFormats: profile.flairs.slice(0, 4).map(flair => flair.text),
    typicalLength: profile.tone.formality > 0.6 ? 'Longer, considered posts' : 'Short and punchy',
    commentStyle: profile.tone.humor > 0.35 ? 'Jokes, callbacks, and the occasional serious reply' : 'Direct answers and follow-up questions',
    commonOpinions: profile.rising.slice(0, 4),
    recurringThemes: profile.recurringThreads,
    contentToAvoid: ['harassment', 'spam', 'reposted content'],
    moderationStyle: 'Simulated moderation — safety filtered before display',
    sourceSubreddit: profile.subreddit,
    dynamic: existing?.dynamic ?? true,
    addedAt: existing?.addedAt || Date.now(),
  };
}

type Listener = () => void;

class Registry {
  private map = new Map<string, CommunityProfile>();
  private listeners = new Set<Listener>();

  constructor() {
    for (const community of builtinCommunities) this.map.set(community.id, { ...community, dynamic: false });
    this.loadStored();
  }

  private loadStored() {
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CommunityProfile[];
      for (const community of parsed) {
        if (!community?.id) continue;
        this.map.set(community.id, { ...this.map.get(community.id), ...community });
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist() {
    try {
      const dynamic = Array.from(this.map.values()).filter(community => community.dynamic);
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(dynamic.slice(-60)));
    } catch {
      /* storage disabled */
    }
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }

  all(): CommunityProfile[] {
    return Array.from(this.map.values());
  }

  get(id: string): CommunityProfile | undefined {
    return this.map.get(id.toLowerCase());
  }

  upsert(community: CommunityProfile) {
    const existing = this.map.get(community.id);
    this.map.set(community.id, { ...existing, ...community });
    this.persist();
    this.emit();
    return this.map.get(community.id)!;
  }

  remove(id: string) {
    const community = this.map.get(id);
    if (!community?.dynamic) return;
    this.map.delete(id);
    this.persist();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const registry = new Registry();

/* ------------------------------------------------------------------ */
/* Context cache                                                       */
/* ------------------------------------------------------------------ */

const memoryContexts = new Map<string, CultureProfile>();
const inFlight = new Map<string, Promise<CultureProfile>>();

function readStoredContext(key: string): CultureProfile | undefined {
  try {
    const raw = localStorage.getItem(CONTEXT_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw) as CultureProfile;
  } catch {
    return undefined;
  }
}

function writeStoredContext(key: string, profile: CultureProfile) {
  try {
    localStorage.setItem(CONTEXT_PREFIX + key, JSON.stringify(profile));
    const index = JSON.parse(localStorage.getItem(CONTEXT_INDEX) || '[]') as string[];
    const next = [key, ...index.filter(item => item !== key)].slice(0, 30);
    localStorage.setItem(CONTEXT_INDEX, JSON.stringify(next));
    for (const stale of index.filter(item => !next.includes(item))) {
      localStorage.removeItem(CONTEXT_PREFIX + stale);
    }
  } catch {
    /* quota or disabled storage — memory cache still works */
  }
}

export function contextKeyFor(community: CommunityProfile) {
  return (community.sourceSubreddit || community.id).toLowerCase();
}

export function isStale(profile: CultureProfile) {
  return Date.now() - profile.fetchedAt > CONTEXT_TTL_MS;
}

/**
 * Live analysis reads culture off the listing itself, but it has no opinion about which
 * broad category a sub belongs to. Borrow that from the offline estimator when it knows
 * the subreddit, so the generator picks the right vocabulary pack.
 */
function withKnownCategory(profile: CultureProfile): CultureProfile {
  if (profile.category) return profile;
  const guess = estimatedProfile(profile.subreddit);
  return guess.category ? { ...profile, category: guess.category } : profile;
}

/** Whatever context we can produce without touching the network. */
export function getContextSync(community: CommunityProfile): CultureProfile {
  const key = contextKeyFor(community);
  const memory = memoryContexts.get(key);
  if (memory) return memory;
  const stored = readStoredContext(key);
  if (stored) {
    const profile = sanitizeProfile({ ...stored, source: isStale(stored) ? 'cached' : stored.source });
    memoryContexts.set(key, profile);
    return profile;
  }
  const fallback = sanitizeProfile(
    community.dynamic === false && community.commonTopics.length
      ? profileFromCommunity(community)
      : estimatedProfile(community.sourceSubreddit || community.id),
  );
  memoryContexts.set(key, fallback);
  return fallback;
}

export interface ContextResult {
  profile: CultureProfile;
  error?: string;
}

/** Load (or refresh) live cultural context for a community. */
export async function loadContext(
  community: CommunityProfile,
  options: { force?: boolean; depth?: 'quick' | 'full' } = {},
): Promise<ContextResult> {
  const key = contextKeyFor(community);
  const current = memoryContexts.get(key) || readStoredContext(key);
  if (!options.force && current && current.source === 'live' && !isStale(current)) {
    const profile = sanitizeProfile(current);
    memoryContexts.set(key, profile);
    return { profile };
  }

  const existing = inFlight.get(key);
  if (existing) return { profile: await existing };

  const task = (async () => {
    const snapshot = await fetchSubredditSnapshot(key, { depth: options.depth || 'full' });
    if (snapshot.about?.over18) throw new ContextUnavailableError('Adult communities are not simulated.', 'private');
    const analysed = sanitizeProfile(withKnownCategory(analyseSnapshot(snapshot, 'live')));
    memoryContexts.set(key, analysed);
    writeStoredContext(key, analysed);
    return analysed;
  })();

  inFlight.set(key, task);
  try {
    const profile = await task;
    return { profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reach Reddit';
    const fallback = current ? sanitizeProfile({ ...current, source: 'cached' as ContextSource }) : getContextSync(community);
    memoryContexts.set(key, fallback);
    return { profile: fallback, error: message };
  } finally {
    inFlight.delete(key);
  }
}

/* ------------------------------------------------------------------ */
/* Community creation                                                  */
/* ------------------------------------------------------------------ */

export interface CreateResult {
  community: CommunityProfile;
  profile: CultureProfile;
  created: boolean;
  warning?: string;
}

export type CreateStage = 'lookup' | 'reading' | 'analysing' | 'writing' | 'done';

/**
 * Turn a searched name into a live community. Any subreddit works — if it is
 * not in the local registry yet it gets created from its real counterpart.
 */
export async function createCommunity(
  rawName: string,
  onStage?: (stage: CreateStage, detail?: string) => void,
): Promise<CreateResult> {
  const name = normalizeSubredditName(rawName);
  if (!name) throw new ContextUnavailableError('Enter a subreddit name.', 'missing');
  const id = name.toLowerCase();
  const existing = registry.get(id);

  onStage?.('lookup', `Looking up r/${name}`);

  try {
    onStage?.('reading', `Reading what r/${name} is talking about`);
    const snapshot = await fetchSubredditSnapshot(name, { depth: 'full' });
    if (snapshot.about?.over18) {
      throw new ContextUnavailableError('Adult communities are not simulated.', 'private');
    }
    onStage?.('analysing', 'Analysing tone, topics and formats');
    const profile = sanitizeProfile(withKnownCategory(analyseSnapshot(snapshot, 'live')));
    memoryContexts.set(id, profile);
    writeStoredContext(id, profile);
    const community = registry.upsert(communityFromProfile(profile, existing));
    onStage?.('writing', 'Writing original posts for this community');
    return { community, profile, created: !existing };
  } catch (error) {
    if (error instanceof ContextUnavailableError && error.kind === 'missing') throw error;
    if (error instanceof ContextUnavailableError && error.kind === 'private') throw error;

    onStage?.('analysing', 'Live context unavailable — building an estimated profile');
    const cached = readStoredContext(id);
    const profile = sanitizeProfile(cached ? { ...cached, source: 'cached' } : estimatedProfile(name));
    memoryContexts.set(id, profile);
    const community = registry.upsert(communityFromProfile(profile, existing));
    onStage?.('writing', 'Writing original posts for this community');
    return {
      community,
      profile,
      created: !existing,
      warning: error instanceof Error ? error.message : 'Live Reddit context was unavailable.',
    };
  }
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

interface Ledger {
  titles: Set<string>;
  signatures: Set<string>;
  batch: number;
}

const ledgers = new Map<string, Ledger>();

function ledgerFor(communityId: string): Ledger {
  let ledger = ledgers.get(communityId);
  if (!ledger) {
    ledger = { titles: new Set(), signatures: new Set(), batch: 0 };
    ledgers.set(communityId, ledger);
  }
  return ledger;
}

export function resetLedger(communityId: string) {
  ledgers.delete(communityId);
}

export interface BatchResult {
  posts: Post[];
  usedModel: boolean;
  modelError?: string;
  source: ContextSource;
}

function safePosts(posts: Post[]): Post[] {
  return posts.filter(post => {
    const text = `${post.title} ${post.body || ''} ${post.concept?.setup || ''} ${post.concept?.punchline || ''}`;
    if (!isSafeText(text)) return false;
    post.commentTree = (post.commentTree || []).filter(comment => isSafeText(comment.body));
    return true;
  });
}

/** Generate the next slice of an endless feed for one community. */
export async function generateBatch(
  community: CommunityProfile,
  options: { count?: number; batch?: number; profile?: CultureProfile } = {},
): Promise<BatchResult> {
  const ledger = ledgerFor(community.id);
  const batch = options.batch ?? ledger.batch;
  ledger.batch = Math.max(ledger.batch, batch + 1);
  const count = options.count ?? 6;
  const profile = options.profile || getContextSync(community);
  const settings = loadModelSettings();

  if (modelIsConfigured(settings)) {
    try {
      const posts = await generateWithModel({
        settings,
        profile,
        community,
        batch,
        count,
        avoidTitles: Array.from(ledger.titles),
      });
      const safe = safePosts(posts).filter(post => {
        const key = post.title.toLowerCase().trim();
        if (ledger.titles.has(key)) return false;
        ledger.titles.add(key);
        return true;
      });
      if (safe.length) return { posts: safe, usedModel: true, source: profile.source };
    } catch (error) {
      const posts = safePosts(synthesizePosts({
        profile,
        community,
        batch,
        count,
        usedTitles: ledger.titles,
        usedSignatures: ledger.signatures,
      }));
      return {
        posts,
        usedModel: false,
        modelError: error instanceof Error ? error.message : 'Model request failed',
        source: profile.source,
      };
    }
  }

  const posts = safePosts(synthesizePosts({
    profile,
    community,
    batch,
    count,
    usedTitles: ledger.titles,
    usedSignatures: ledger.signatures,
  }));
  return { posts, usedModel: false, source: profile.source };
}

/** Generate a blended batch across every community the user follows. */
export async function generateHomeBatch(
  communityIds: string[],
  batch: number,
  size = 6,
): Promise<Post[]> {
  const pool = communityIds
    .map(id => registry.get(id))
    .filter((community): community is CommunityProfile => Boolean(community));
  if (!pool.length) return [];

  const rotation = pool.slice();
  const start = (batch * 2) % rotation.length;
  const ordered = [...rotation.slice(start), ...rotation.slice(0, start)];
  const perCommunity = Math.max(1, Math.round(size / Math.min(ordered.length, 4)));
  const chosen = ordered.slice(0, Math.min(ordered.length, Math.ceil(size / perCommunity)));

  const batches = await Promise.all(
    chosen.map((community, index) =>
      generateBatch(community, { count: perCommunity, batch: batch + index })
        .then(result => result.posts)
        .catch(() => [])),
  );

  const merged = batches.flat();
  // Interleave so the home feed never shows three posts from one community in a row.
  merged.sort((a, b) => (a.ageMinutes || 0) - (b.ageMinutes || 0));
  const interleaved: Post[] = [];
  const buckets = new Map<string, Post[]>();
  for (const post of merged) {
    const bucket = buckets.get(post.communityId) || [];
    bucket.push(post);
    buckets.set(post.communityId, bucket);
  }
  while (interleaved.length < merged.length) {
    let added = false;
    for (const bucket of buckets.values()) {
      const next = bucket.shift();
      if (next) {
        interleaved.push(next);
        added = true;
      }
    }
    if (!added) break;
  }
  return interleaved.slice(0, size);
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export function sortPosts(posts: Post[], sort: SortOption): Post[] {
  const copy = [...posts];
  const age = (post: Post) => post.ageMinutes ?? 600;
  if (sort === 'Top') return copy.sort((a, b) => b.score - a.score);
  if (sort === 'New') return copy.sort((a, b) => age(a) - age(b));
  if (sort === 'Rising') {
    return copy.sort((a, b) =>
      (b.score / Math.max(30, age(b))) - (a.score / Math.max(30, age(a))));
  }
  if (sort === 'Hot') {
    return copy.sort((a, b) =>
      (b.score + b.comments * 3) / Math.pow(Math.max(1, age(b)) / 60 + 2, 1.35) -
      (a.score + a.comments * 3) / Math.pow(Math.max(1, age(a)) / 60 + 2, 1.35));
  }
  return copy.sort((a, b) => (b.score * 0.7 + b.comments * 2.4) - (a.score * 0.7 + a.comments * 2.4));
}

export { ContextUnavailableError, normalizeSubredditName } from './redditContext';
