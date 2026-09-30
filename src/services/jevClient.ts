/**
 * Jev AI — typed decisions used as the taste layer for the infinite feed.
 *
 * Jev is NOT a text generator. It answers typed questions about material you
 * give it and returns `noul` (probability of yes), `choice` (a label plus a
 * probability distribution) or `score` (a level on an ordered scale). There is
 * no prose output — output tokens are billed at zero because there are none.
 *
 * So Jev does not write posts here. It judges them. The pipeline over-generates
 * candidates with the built-in engine (or a real LLM if a key is set), asks Jev
 * which ones actually belong in this community right now, and keeps the best.
 * That is what turns an endless feed from "never repeats" into "never drifts".
 *
 * Transport: prefers a Worker proxy so the key stays server-side (Jev's docs ask
 * for this). Falls back to a direct browser call with the bundled public key.
 * Every failure is non-fatal — curation is a bonus, never a dependency.
 */

import type { CultureProfile, Post } from '../types';
import { BUNDLED_JEV_KEY, JEV_BASE_URL, JEV_MODEL } from '../config/providers';

/* ------------------------------------------------------------------ */
/* Wire types                                                          */
/* ------------------------------------------------------------------ */

type JevQuestion =
  | { type: 'noul'; instructions: string; criteria?: { true?: string; false?: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
  | { type: 'score'; instructions: string; criteria: string[] };

interface JevNoulAnswer { type: 'noul'; noul: number }
interface JevChoiceAnswer { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
interface JevScoreAnswer { type: 'score'; score: number; legend?: string[]; confidence: number }
type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevScoreAnswer;

interface JevResponse {
  model?: string;
  answers?: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface JevSettings {
  /** Master switch. */
  enabled: boolean;
  /** Per-device key override. Blank means use the bundled public key. */
  apiKey: string;
  /** How aggressively to filter: 0 keeps nearly everything, 1 is ruthless. */
  strictness: number;
}

const SETTINGS_KEY = 'fora-jev-settings';
const DISABLED_KEY = 'fora-jev-unreachable';

export const defaultJevSettings: JevSettings = { enabled: true, apiKey: '', strictness: 0.5 };

export function loadJevSettings(): JevSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultJevSettings };
    const parsed = JSON.parse(raw) as Partial<JevSettings>;
    return {
      enabled: parsed.enabled ?? true,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      strictness: typeof parsed.strictness === 'number' ? Math.min(1, Math.max(0, parsed.strictness)) : 0.5,
    };
  } catch {
    return { ...defaultJevSettings };
  }
}

export function saveJevSettings(settings: JevSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.enabled) localStorage.removeItem(DISABLED_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Jev's docs say browser-side keys are not supported, and the endpoint may not
 * send CORS headers. Rather than retrying on every scroll, the first transport
 * failure parks the direct path for an hour.
 */
function directPathIsParked(): boolean {
  try {
    const until = Number(localStorage.getItem(DISABLED_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function parkDirectPath() {
  try {
    localStorage.setItem(DISABLED_KEY, String(Date.now() + 60 * 60 * 1000));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export type JevStatus = 'idle' | 'proxy' | 'direct' | 'unavailable' | 'disabled';

let lastStatus: JevStatus = 'idle';
let lastDetail = '';
let judged = 0;
let dropped = 0;

export function jevStatus() {
  return { status: lastStatus, detail: lastDetail, judged, dropped };
}

/* ------------------------------------------------------------------ */
/* Transport                                                           */
/* ------------------------------------------------------------------ */

interface JevRequest {
  model: string;
  state: unknown;
  questions: Record<string, JevQuestion>;
}

/**
 * Sends one decision request.
 *
 * `proxyBase` is a deployed Worker that holds the key as a server-side secret.
 * When present it is always preferred: no key leaves the browser at all.
 */
async function askJev(body: JevRequest, proxyBase: string, apiKey: string, signal?: AbortSignal): Promise<JevResponse> {
  if (proxyBase) {
    const url = `${proxyBase.replace(/\/$/, '')}/v1/decisions`;
    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Jev proxy returned ${response.status}`);
    lastStatus = 'proxy';
    return (await response.json()) as JevResponse;
  }

  if (directPathIsParked()) throw new Error('Direct Jev path parked after an earlier failure');

  const response = await fetch(`${JEV_BASE_URL}/v1/systemone`, {
    method: 'POST',
    signal,
    referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    parkDirectPath();
    throw new Error('Jev rejected the key');
  }
  if (response.status === 402) {
    parkDirectPath();
    throw new Error('Jev balance exhausted');
  }
  if (!response.ok) throw new Error(`Jev returned ${response.status}`);
  lastStatus = 'direct';
  return (await response.json()) as JevResponse;
}

/* ------------------------------------------------------------------ */
/* Curation                                                            */
/* ------------------------------------------------------------------ */

/** A compact brief. Jev bills per question on the input sequence, so keep this small. */
function communityBrief(profile: CultureProfile) {
  return {
    community: `r/${profile.subreddit}`,
    talking_about_now: profile.topics.slice(0, 5).map(topic => topic.label),
    rising: profile.rising.slice(0, 5),
    community_words: profile.slang.slice(0, 6),
    style: [
      profile.tone.humor > 0.4 ? 'joke-heavy' : profile.tone.humor > 0.18 ? 'lightly funny' : 'mostly serious',
      profile.tone.formality > 0.6 ? 'long-form and considered' : 'casual and quick',
      profile.tone.lowercase > 0.4 ? 'often lowercase titles' : 'normal capitalisation',
    ].join(', '),
  };
}

const QUESTIONS: Record<string, JevQuestion> = {
  fit: {
    type: 'score',
    instructions:
      'How well does the candidate post match what this community is talking about right now, given its current topics and words?',
    criteria: [
      'Unrelated to this community',
      'Vaguely on-theme but not current',
      'Relevant to the community, tangential to current topics',
      'Clearly about a current topic',
      'Exactly the conversation this community is having right now',
    ],
  },
  authentic: {
    type: 'noul',
    instructions: 'Would this read as a post genuinely written by a member of this community, in its usual voice?',
    criteria: {
      true: 'The phrasing, format and attitude match how this community writes.',
      false: 'It reads as generic, stilted, or written by an outsider.',
    },
  },
  filler: {
    type: 'noul',
    instructions: 'Is this post interchangeable filler that could be posted in almost any community without changing it?',
    criteria: {
      true: 'Generic. Swap the topic word and it fits anywhere.',
      false: 'Specific to this community and its current discussion.',
    },
  },
};

export interface Judgement {
  postId: string;
  fit: number;
  authentic: number;
  filler: number;
  rank: number;
}

/** Turn Jev's typed answers into a single 0..1 ranking value. */
function scoreOf(answers: Record<string, JevAnswer> | undefined): Omit<Judgement, 'postId'> {
  const fitAnswer = answers?.fit;
  const authenticAnswer = answers?.authentic;
  const fillerAnswer = answers?.filler;

  // `score` returns the selected level on the ordered scale; normalise to 0..1.
  const levels = QUESTIONS.fit.type === 'score' ? QUESTIONS.fit.criteria.length : 5;
  const fit = fitAnswer && fitAnswer.type === 'score' ? Math.min(1, Math.max(0, fitAnswer.score / (levels - 1))) : 0.5;
  const authentic = authenticAnswer && authenticAnswer.type === 'noul' ? authenticAnswer.noul : 0.5;
  const filler = fillerAnswer && fillerAnswer.type === 'noul' ? fillerAnswer.noul : 0.5;

  const rank = fit * 0.5 + authentic * 0.35 + (1 - filler) * 0.15;
  return { fit, authentic, filler, rank };
}

async function judgeOne(
  post: Post,
  profile: CultureProfile,
  proxyBase: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Judgement | null> {
  const state = {
    ...communityBrief(profile),
    candidate_post: {
      title: post.title,
      body: (post.body || post.concept?.setup || '').slice(0, 600),
      type: post.type,
      flair: post.flair || '',
    },
  };
  try {
    const response = await askJev({ model: JEV_MODEL, state, questions: QUESTIONS }, proxyBase, apiKey, signal);
    return { postId: post.id, ...scoreOf(response.answers) };
  } catch (error) {
    lastDetail = error instanceof Error ? error.message : 'Jev call failed';
    throw error;
  }
}

/** Run promises with a small concurrency cap so a scroll batch does not burst. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface CurateResult {
  posts: Post[];
  used: boolean;
  judged: number;
  dropped: number;
  note?: string;
}

/**
 * Judge `candidates` and return the best `keep` of them, in Jev's preferred order.
 *
 * Never throws and never blocks the feed: if Jev is unreachable, the candidates
 * are returned untouched, trimmed to `keep`.
 */
export async function curateBatch(
  candidates: Post[],
  profile: CultureProfile,
  keep: number,
  options: { proxyBase?: string; settings?: JevSettings; signal?: AbortSignal } = {},
): Promise<CurateResult> {
  const settings = options.settings || loadJevSettings();
  const proxyBase = options.proxyBase || '';
  const apiKey = (settings.apiKey || BUNDLED_JEV_KEY).trim();

  if (!settings.enabled) {
    lastStatus = 'disabled';
    return { posts: candidates.slice(0, keep), used: false, judged: 0, dropped: 0 };
  }
  if (candidates.length <= keep) {
    // Nothing to choose between — do not spend a request.
    return { posts: candidates, used: false, judged: 0, dropped: 0 };
  }
  if (!proxyBase && (!apiKey || directPathIsParked())) {
    lastStatus = 'unavailable';
    return { posts: candidates.slice(0, keep), used: false, judged: 0, dropped: 0, note: lastDetail };
  }

  try {
    const judgements = await mapLimit(candidates, 4, candidate =>
      judgeOne(candidate, profile, proxyBase, apiKey, options.signal),
    );
    const byId = new Map<string, Judgement>();
    for (const judgement of judgements) if (judgement) byId.set(judgement.postId, judgement);
    if (!byId.size) throw new Error('No usable Jev answers');

    // Strictness raises the bar a post has to clear before it is allowed through.
    const floor = 0.3 + settings.strictness * 0.35;
    const ranked = [...candidates].sort((a, b) => (byId.get(b.id)?.rank ?? 0) - (byId.get(a.id)?.rank ?? 0));
    const passing = ranked.filter(post => (byId.get(post.id)?.rank ?? 0) >= floor);
    // Always fill the page: if too few clear the bar, top up with the next best.
    const chosen = (passing.length >= keep ? passing : ranked).slice(0, keep);

    const curated = chosen.map(post => {
      const judgement = byId.get(post.id);
      return judgement
        ? { ...post, curation: { fit: judgement.fit, authentic: judgement.authentic, rank: judgement.rank } }
        : post;
    });

    judged += byId.size;
    dropped += Math.max(0, candidates.length - curated.length);
    lastDetail = '';
    return { posts: curated, used: true, judged: byId.size, dropped: candidates.length - curated.length };
  } catch (error) {
    const note = error instanceof Error ? error.message : 'Jev unavailable';
    if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(note)) {
      parkDirectPath();
      lastDetail = 'Jev blocked the browser request (CORS). Deploy the Worker to enable it.';
    } else {
      lastDetail = note;
    }
    lastStatus = 'unavailable';
    return { posts: candidates.slice(0, keep), used: false, judged: 0, dropped: 0, note: lastDetail };
  }
}

/** One cheap call used by Settings to show whether Jev is actually reachable. */
export async function testJev(proxyBase: string, apiKey: string): Promise<{ ok: boolean; detail: string }> {
  const key = (apiKey || BUNDLED_JEV_KEY).trim();
  try {
    const response = await askJev(
      {
        model: JEV_MODEL,
        state: 'A post about keyboard switches in a mechanical keyboard community.',
        questions: { on_topic: { type: 'noul', instructions: 'Is this on topic for a keyboard community?' } },
      },
      proxyBase,
      key,
    );
    const answer = response.answers?.on_topic;
    const value = answer && answer.type === 'noul' ? answer.noul : null;
    return {
      ok: true,
      detail: value === null ? 'Connected' : `Connected — test decision returned ${(value * 100).toFixed(0)}% yes`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(message)) {
      return { ok: false, detail: 'Blocked by CORS — Jev needs the Worker proxy for browser use' };
    }
    return { ok: false, detail: message };
  }
}
