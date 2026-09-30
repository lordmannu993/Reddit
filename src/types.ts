export type SortOption = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';
export type VoteState = 'up' | 'down' | null;

/** Where a community's cultural context came from. */
export type ContextSource = 'live' | 'cached' | 'builtin' | 'offline' | 'loading';

export interface CommunityProfile {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  colorSoft: string;
  category: string;
  description: string;
  members: number;
  online: number;
  created: string;
  subscribed: boolean;
  rules: string[];
  tone: string;
  vocabulary: string[];
  typicalUsers: string;
  commonTopics: string[];
  preferredFormats: string[];
  typicalLength: string;
  commentStyle: string;
  commonOpinions: string[];
  recurringThemes: string[];
  contentToAvoid: string[];
  moderationStyle: string;
  /** Real subreddit this simulation draws its cultural context from. */
  sourceSubreddit?: string;
  /** True when the community was created on demand from a search. */
  dynamic?: boolean;
  /** Epoch ms the community was added to the local registry. */
  addedAt?: number;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  body: string;
  score: number;
  time: string;
  isOp?: boolean;
  isMod?: boolean;
  replies?: Comment[];
}

/** A described visual idea. We never fabricate photographs, so image-style posts render as concepts. */
export interface MemeConcept {
  format: string;
  setup: string;
  punchline: string;
  altText: string;
}

export interface Post {
  id: string;
  communityId: string;
  author: string;
  avatar: string;
  title: string;
  body?: string;
  flair?: string;
  flairColor?: string;
  score: number;
  comments: number;
  time: string;
  /** Minutes since posting, used for sorting and relative labels. */
  ageMinutes?: number;
  type: 'text' | 'image' | 'link' | 'poll';
  image?: string;
  imageAlt?: string;
  concept?: MemeConcept;
  domain?: string;
  readTime?: string;
  trend?: 'rising' | 'hot';
  commentTree?: Comment[];
  pollOptions?: { label: string; votes: number }[];
  /** Simulation metadata. */
  generated?: boolean;
  generator?: 'engine' | 'model' | 'you';
  archetype?: string;
  topicLabel?: string;
  contextSource?: ContextSource;
  batch?: number;
  /**
   * Jev's typed verdict on this post, when the decision layer picked it.
   * `rank` is the blended value used for ordering; the others are raw.
   */
  curation?: { fit: number; authentic: number; rank: number };
}

/** A cluster of terms the real community is currently circling around. */
export interface TopicCluster {
  id: string;
  label: string;
  terms: string[];
  entities: string[];
  /** 0–1 relative attention within the sampled window. */
  heat: number;
  momentum: 'rising' | 'steady' | 'fading';
  kind: 'meme' | 'theory' | 'question' | 'media' | 'news' | 'help' | 'general';
  mentions: number;
}

export interface ToneSignals {
  humor: number;
  formality: number;
  questionRate: number;
  exclamation: number;
  lowercase: number;
  profanity: number;
  emoji: number;
  avgTitleWords: number;
  selfPostRate: number;
  spoilerRate: number;
}

export interface FormatMix {
  text: number;
  image: number;
  link: number;
  video: number;
  poll: number;
}

/** Everything the generator knows about a community's current culture. */
export interface CultureProfile {
  subreddit: string;
  displayName: string;
  title: string;
  description: string;
  source: ContextSource;
  fetchedAt: number;
  windowHours: number;
  sampleSize: number;
  subscribers: number;
  activeUsers: number;
  over18: boolean;
  primaryColor?: string;
  topics: TopicCluster[];
  entities: { term: string; count: number }[];
  phrases: { term: string; count: number }[];
  slang: string[];
  rising: string[];
  flairs: { text: string; count: number }[];
  formatMix: FormatMix;
  tone: ToneSignals;
  recurringThreads: string[];
  notes: string[];
  /** Human-readable label for where the signal came from. */
  transport?: string;
  /** Broad category, inferred offline or supplied by a built-in profile. */
  category?: string;
}

export interface ContextState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  profile?: CultureProfile;
  error?: string;
  refreshing?: boolean;
}

export type ModelProvider = 'none' | 'openai' | 'gemini' | 'anthropic' | 'custom';

export interface ModelSettings {
  provider: ModelProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export type Page =
  | { type: 'home' }
  | { type: 'explore' }
  | { type: 'community'; id: string }
  | { type: 'post'; id: string }
  | { type: 'saved' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'search'; query: string };
