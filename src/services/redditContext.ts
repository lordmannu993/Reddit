/**
 * Live context layer.
 *
 * Reads *public* metadata and listings from a real subreddit so the simulation
 * knows what that community is currently talking about. Nothing fetched here is
 * ever rendered as content — `cultureAnalysis` reduces it to statistical signal
 * (topics, entities, tone, formats) and the generator writes original posts from
 * that signal.
 *
 * Reddit does not send CORS headers for browser requests, so we walk a chain of
 * transports (dev proxy, public read-only mirrors, user-supplied proxy) and
 * remember whichever one answered.
 */

const UA_NOTE = 'fora-simulation';

export interface RawRedditPost {
  id: string;
  title: string;
  selftext: string;
  flair: string;
  author: string;
  score: number;
  comments: number;
  createdUtc: number;
  upvoteRatio: number;
  isSelf: boolean;
  isVideo: boolean;
  isGallery: boolean;
  postHint: string;
  domain: string;
  stickied: boolean;
  spoiler: boolean;
  over18: boolean;
  poll: boolean;
  listing: string;
}

export interface RawSubredditAbout {
  name: string;
  displayName: string;
  title: string;
  publicDescription: string;
  description: string;
  subscribers: number;
  activeUsers: number;
  createdUtc: number;
  over18: boolean;
  primaryColor: string;
  iconImg: string;
  quarantine: boolean;
}

export interface SubredditSnapshot {
  about: RawSubredditAbout | null;
  posts: RawRedditPost[];
  transport: string;
  fetchedAt: number;
}

export class ContextUnavailableError extends Error {
  constructor(message: string, readonly kind: 'network' | 'missing' | 'private' = 'network') {
    super(message);
    this.name = 'ContextUnavailableError';
  }
}

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

interface Transport {
  id: string;
  label: string;
  devOnly?: boolean;
  build: (path: string) => string;
}

const redditUrl = (path: string) => `https://www.reddit.com/${path.replace(/^\//, '')}`;

const CUSTOM_PROXY_KEY = 'fora-custom-proxy';

function customProxyTemplate(): string {
  try {
    return localStorage.getItem(CUSTOM_PROXY_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomProxy(template: string) {
  try {
    if (template.trim()) localStorage.setItem(CUSTOM_PROXY_KEY, template.trim());
    else localStorage.removeItem(CUSTOM_PROXY_KEY);
    preferredTransport = null;
  } catch {
    /* storage disabled */
  }
}

export function getCustomProxy() {
  return customProxyTemplate();
}

function transports(): Transport[] {
  const list: Transport[] = [];
  const custom = customProxyTemplate();
  if (custom) {
    list.push({
      id: 'custom',
      label: 'your proxy',
      build: path => custom.includes('{url}')
        ? custom.replace('{url}', encodeURIComponent(redditUrl(path)))
        : custom.replace(/\/$/, '') + '/' + path.replace(/^\//, ''),
    });
  }
  if (import.meta.env.DEV) {
    list.push({ id: 'dev-proxy', label: 'dev proxy', devOnly: true, build: path => `/reddit-json/${path.replace(/^\//, '')}` });
  }
  list.push(
    { id: 'allorigins', label: 'allorigins mirror', build: path => `https://api.allorigins.win/raw?url=${encodeURIComponent(redditUrl(path))}` },
    { id: 'codetabs', label: 'codetabs mirror', build: path => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(redditUrl(path))}` },
    { id: 'corsproxy', label: 'corsproxy mirror', build: path => `https://corsproxy.io/?url=${encodeURIComponent(redditUrl(path))}` },
    { id: 'thingproxy', label: 'r.jina.ai mirror', build: path => `https://r.jina.ai/${redditUrl(path)}` },
    { id: 'direct', label: 'reddit.com', build: path => `${redditUrl(path)}` },
  );
  return list;
}

let preferredTransport: string | null = null;
try {
  preferredTransport = localStorage.getItem('fora-transport');
} catch {
  preferredTransport = null;
}

function rememberTransport(id: string) {
  preferredTransport = id;
  try {
    localStorage.setItem('fora-transport', id);
  } catch {
    /* ignore */
  }
}

async function timedFetch(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseMaybeJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('empty response');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  // Some text mirrors wrap the payload in prose or code fences.
  const start = trimmed.search(/[[{]/);
  if (start === -1) throw new Error('not json');
  const candidate = trimmed.slice(start);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (end === -1) throw new Error('not json');
  return JSON.parse(candidate.slice(0, end + 1));
}

/** Fetch a reddit JSON path through whichever transport works, fastest-known-first. */
async function fetchJson(path: string, perAttemptMs = 7000): Promise<{ data: unknown; transport: Transport }> {
  const all = transports();
  const ordered = preferredTransport
    ? [...all.filter(t => t.id === preferredTransport), ...all.filter(t => t.id !== preferredTransport)]
    : all;

  let lastError: unknown = null;
  for (const transport of ordered) {
    try {
      const response = await timedFetch(transport.build(path), perAttemptMs);
      if (response.status === 404) throw new ContextUnavailableError('That subreddit does not exist.', 'missing');
      if (response.status === 403 || response.status === 451) throw new ContextUnavailableError('That community is private or restricted.', 'private');
      if (!response.ok) throw new Error(`${transport.id} responded ${response.status}`);
      const data = parseMaybeJson(await response.text());
      if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
        const code = Number((data as Record<string, unknown>).error);
        if (code === 404) throw new ContextUnavailableError('That subreddit does not exist.', 'missing');
        if (code === 403) throw new ContextUnavailableError('That community is private or restricted.', 'private');
      }
      rememberTransport(transport.id);
      return { data, transport };
    } catch (error) {
      if (error instanceof ContextUnavailableError && error.kind !== 'network') throw error;
      lastError = error;
    }
  }
  throw new ContextUnavailableError(
    `Could not reach Reddit (${lastError instanceof Error ? lastError.message : 'all transports failed'})`,
    'network',
  );
}

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

export function normalizeSubredditName(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.|old\.|new\.)?reddit\.com/i, '')
    .replace(/^\/?(r\/)?/i, '')
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, '')
    .slice(0, 24);
}

export function looksLikeSubreddit(input: string): boolean {
  const name = normalizeSubredditName(input);
  return name.length >= 2 && name.length <= 24 && /^[A-Za-z0-9_]+$/.test(name);
}

const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const bool = (value: unknown) => value === true;

function toAbout(payload: unknown): RawSubredditAbout | null {
  const data = (payload as { data?: Record<string, unknown> })?.data;
  if (!data || typeof data !== 'object') return null;
  return {
    name: str(data.display_name),
    displayName: str(data.display_name_prefixed, `r/${str(data.display_name)}`),
    title: str(data.title),
    publicDescription: str(data.public_description),
    description: str(data.description).slice(0, 4000),
    subscribers: num(data.subscribers),
    activeUsers: num(data.accounts_active) || num(data.active_user_count),
    createdUtc: num(data.created_utc),
    over18: bool(data.over18),
    primaryColor: str(data.primary_color) || str(data.key_color) || str(data.banner_background_color),
    iconImg: str(data.community_icon) || str(data.icon_img),
    quarantine: bool(data.quarantine),
  };
}

function toPosts(payload: unknown, listing: string): RawRedditPost[] {
  const children = (payload as { data?: { children?: unknown[] } })?.data?.children;
  if (!Array.isArray(children)) return [];
  const out: RawRedditPost[] = [];
  for (const child of children) {
    const data = (child as { data?: Record<string, unknown> })?.data;
    if (!data || typeof data !== 'object') continue;
    out.push({
      id: str(data.id),
      title: str(data.title),
      selftext: str(data.selftext).slice(0, 1200),
      flair: str(data.link_flair_text),
      author: str(data.author),
      score: num(data.score),
      comments: num(data.num_comments),
      createdUtc: num(data.created_utc),
      upvoteRatio: num(data.upvote_ratio, 0.9),
      isSelf: bool(data.is_self),
      isVideo: bool(data.is_video),
      isGallery: bool(data.is_gallery),
      postHint: str(data.post_hint),
      domain: str(data.domain),
      stickied: bool(data.stickied) || bool(data.pinned),
      spoiler: bool(data.spoiler),
      over18: bool(data.over_18),
      poll: Boolean(data.poll_data),
      listing,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface SnapshotOptions {
  /** How many listings to pull. Fewer = faster first paint. */
  depth?: 'quick' | 'full';
  signal?: AbortSignal;
}

/**
 * Pull a snapshot of what a subreddit currently looks like.
 * Mixes several listings so we see both what is popular and what is arriving.
 */
export async function fetchSubredditSnapshot(rawName: string, options: SnapshotOptions = {}): Promise<SubredditSnapshot> {
  const name = normalizeSubredditName(rawName);
  if (!name) throw new ContextUnavailableError('Enter a subreddit name.', 'missing');

  const aboutResult = await fetchJson(`r/${name}/about.json?raw_json=1`);
  const about = toAbout(aboutResult.data);
  if (!about || !about.name) throw new ContextUnavailableError('That subreddit does not exist.', 'missing');

  const listings: [string, string][] = options.depth === 'quick'
    ? [['hot', `r/${name}/hot.json?limit=50&raw_json=1`], ['new', `r/${name}/new.json?limit=40&raw_json=1`]]
    : [
      ['hot', `r/${name}/hot.json?limit=75&raw_json=1`],
      ['new', `r/${name}/new.json?limit=60&raw_json=1`],
      ['top-week', `r/${name}/top.json?limit=60&t=week&raw_json=1`],
      ['rising', `r/${name}/rising.json?limit=30&raw_json=1`],
    ];

  const results = await Promise.allSettled(listings.map(([, path]) => fetchJson(path)));
  const posts: RawRedditPost[] = [];
  const seen = new Set<string>();
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    for (const post of toPosts(result.value.data, listings[index][0])) {
      if (!post.title || seen.has(post.id)) continue;
      seen.add(post.id);
      posts.push(post);
    }
  });

  if (!posts.length) throw new ContextUnavailableError('No public posts available for that community.', 'private');

  return { about, posts, transport: aboutResult.transport.label, fetchedAt: Date.now() };
}

export interface SubredditSuggestion {
  name: string;
  displayName: string;
  subscribers: number;
  description: string;
  over18: boolean;
}

/** Autocomplete-style lookup used by search. Fails soft — suggestions are a bonus. */
export async function searchSubreddits(query: string, limit = 8): Promise<SubredditSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const { data } = await fetchJson(`subreddits/search.json?q=${encodeURIComponent(q)}&limit=${limit}&include_over_18=off&raw_json=1`, 5500);
    const children = (data as { data?: { children?: unknown[] } })?.data?.children;
    if (!Array.isArray(children)) return [];
    return children
      .map(child => (child as { data?: Record<string, unknown> })?.data)
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map(item => ({
        name: str(item.display_name),
        displayName: str(item.display_name_prefixed, `r/${str(item.display_name)}`),
        subscribers: num(item.subscribers),
        description: str(item.public_description),
        over18: bool(item.over18),
      }))
      .filter(item => item.name && !item.over18);
  } catch {
    return [];
  }
}

export const contextDebug = {
  get transport() {
    return preferredTransport;
  },
  reset() {
    preferredTransport = null;
    try {
      localStorage.removeItem('fora-transport');
    } catch {
      /* ignore */
    }
  },
  note: UA_NOTE,
};
