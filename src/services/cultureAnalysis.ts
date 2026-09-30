/**
 * Culture analysis.
 *
 * Reduces a subreddit snapshot to *signal*: what the community is circling
 * around right now, which names and phrases keep resurfacing, how people write,
 * and which formats dominate. The output is the only thing the generator sees,
 * which is what keeps generated content original instead of derivative.
 */

import type { CultureProfile, FormatMix, ToneSignals, TopicCluster } from '../types';
import type { RawRedditPost, SubredditSnapshot } from './redditContext';

const STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be because been before being below
between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't
has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into
is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out
over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there
there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've
were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll
you're you've your yours yourself yourselves im ive dont doesnt didnt isnt wasnt arent cant wont youre theyre thats whats hes shes
lets gonna gotta wanna kinda sorta just really very much many lot lots get got getting go goes going went come comes coming make makes
making made take takes taking took see sees seeing saw look looks looking know knows knowing knew think thinks thinking thought want
wants wanting need needs needing say says saying said tell tells telling told feel feels feeling felt one two three four five six seven
eight nine ten first second third new old good bad best worst better worse great time day days week weeks month months year years thing
things people person guy guys man men woman women someone something anything everything nothing also even still back way ways use uses
using used help please thanks thank hi hello yes yeah nope yep okay ok oh ah hey now today tonight yesterday tomorrow never always
sometimes maybe probably actually literally basically honestly seriously pretty quite bit little big small long short next last another
around might must shall should etc via amp nbsp http https www com reddit subreddit sub post posts comment comments thread threads
thoughts opinions question questions answer answers update updates guide guides tips advice idea ideas
everyone anyone anybody nobody somebody stuff kind sort type types part parts end start point points
reason reasons problem problems issue issues story stories talk talking discussion discussions edit edits
weird crazy insane amazing awesome cool nice sure right wrong true false yeah nah lol lmao imo imho tbh
ngl fyi tldr dm pm op mod mods rule rules karma upvote upvotes downvote downvotes repost crosspost`
  .split(/\s+/)
  .filter(Boolean));

/** Treat "thoughts"/"threads" the same as "thought"/"thread" so plurals cannot sneak through. */
function isStopword(token: string): boolean {
  if (STOPWORDS.has(token)) return true;
  if (token.endsWith('s') && STOPWORDS.has(token.slice(0, -1))) return true;
  if (token.endsWith('es') && STOPWORDS.has(token.slice(0, -2))) return true;
  return false;
}

/** Words that are common enough in general English that they never count as community slang. */
const COMMON = new Set(`work working works home house play playing played game games friend friends family life love hate live living
world start started starting end ended ending try trying tried keep keeping kept give gives giving gave find finds finding found ask
asks asking asked run running ran walk walking talk talking talked call calling called turn turning move moving moved put putting set
setting sit sitting stand standing leave leaving left right wrong true false real fake sure hard easy simple different sam same able
sorry idea ideas question questions answer answers problem problems reason reasons point points part parts kind kinds sort type types
place places side hand head eye eyes face body water food room door car money job hour hours minute minutes second stuff bunch couple
today week place thanks welcome everyone anyone nobody everybody guess mean means meant happen happens happened hope hoping wish wished
believe believed remember forgot understand understood learn learning learned read reading write writing wrote watch watching watched
buy buying bought sell selling sold pay paying paid spend spent save saving saved build building built change changing changed add
adding added remove removing removed check checking checked update updating updated share sharing shared post posting posted`
  .split(/\s+/)
  .filter(Boolean));

const MEME_MARKERS = /\b(meme|memes|shitpost|shitposting|cursed|lmao|lmfao|lol|pov|when you|me when|literally me|fr|no way|bruh|based|cringe|sus|goofy|ahh|💀|😭)\b/i;
const THEORY_MARKERS = /\b(theory|theories|foreshadow\w*|evidence|connection|connected|symbolis\w+|means|hidden|secret|clue|clues|predict\w*|implies|parallel|analysis|deep dive|detail)\b/i;
const QUESTION_MARKERS = /\b(how|what|why|when|where|which|who|does|do|should|can|is it|anyone|advice|recommend\w*|help)\b/i;
const MEDIA_MARKERS = /\b(oc|art|fanart|drew|drawing|painted|painting|made|making|animation|animated|cosplay|photo|render|sketch|comic|edit|remix|build|screenshot|clip)\b/i;
const NEWS_MARKERS = /\b(announce\w*|release\w*|launch\w*|update|updated|patch|trailer|datamine\w*|leak\w*|confirmed|official|news|report\w*|statement|delay\w*)\b/i;
const HELP_MARKERS = /\b(help|issue|issues|problem|broken|fix|error|bug|stuck|advice|question|beginner|newbie|noob|first time|how do i|how to)\b/i;
const PROFANITY = /\b(damn|hell|crap|shit|fuck\w*|ass|wtf|af)\b/i;
const RECURRING = /\b(daily|weekly|monthly|megathread|mega thread|discussion thread|free talk|no stupid questions|simple questions|what are you|check[- ]in|roundup|rules|welcome|read this)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const HOUR = 3600;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9'’\- ]+/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/^['’\-]+|['’\-]+$/g, ''))
    .filter(token => token.length > 2 && token.length < 24 && !isStopword(token) && !/^\d+$/.test(token));
}

function classify(post: RawRedditPost): TopicCluster['kind'] {
  const text = `${post.title} ${post.selftext.slice(0, 220)} ${post.flair}`;
  if (MEME_MARKERS.test(text)) return 'meme';
  if (THEORY_MARKERS.test(text)) return 'theory';
  if (NEWS_MARKERS.test(text)) return 'news';
  if (HELP_MARKERS.test(text) && post.title.includes('?')) return 'help';
  if (MEDIA_MARKERS.test(text) && !post.isSelf) return 'media';
  if (post.title.includes('?') || QUESTION_MARKERS.test(post.title.split(' ').slice(0, 3).join(' '))) return 'question';
  return 'general';
}

/** Recency-and-engagement weight. Newer, busier threads shape the culture more. */
function weightOf(post: RawRedditPost, now: number): number {
  const ageHours = Math.max(0.5, (now / 1000 - post.createdUtc) / HOUR);
  const recency = 1 / (1 + Math.log2(1 + ageHours / 12));
  const engagement = Math.log10(10 + post.score) + Math.log10(4 + post.comments * 2);
  const listingBoost = post.listing === 'rising' ? 1.35 : post.listing === 'new' ? 1.1 : 1;
  return recency * engagement * listingBoost;
}

function titleCase(word: string, casings: Map<string, Map<string, number>>): string {
  const observed = casings.get(word);
  if (!observed) return word;
  let best = word;
  let bestCount = 0;
  for (const [form, count] of observed) {
    if (count > bestCount) {
      best = form;
      bestCount = count;
    }
  }
  return best;
}

function jaccard(a: Set<number>, b: Set<number>) {
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared / (a.size + b.size - shared || 1);
}

function toneOf(posts: RawRedditPost[]): ToneSignals {
  const titles = posts.map(post => post.title);
  const total = titles.length || 1;
  const words = titles.reduce((sum, title) => sum + title.split(/\s+/).length, 0) / total;
  const lowercase = titles.filter(title => title === title.toLowerCase() && /[a-z]/.test(title)).length / total;
  const questions = titles.filter(title => title.includes('?')).length / total;
  const exclamation = titles.filter(title => title.includes('!')).length / total;
  const humor = posts.filter(post => MEME_MARKERS.test(`${post.title} ${post.flair}`)).length / total;
  const profanity = titles.filter(title => PROFANITY.test(title)).length / total;
  const emoji = titles.filter(title => EMOJI.test(title)).length / total;
  const selfPostRate = posts.filter(post => post.isSelf).length / total;
  const spoilerRate = posts.filter(post => post.spoiler || /spoiler/i.test(post.title + post.flair)).length / total;
  const longFormRate = posts.filter(post => post.selftext.length > 400).length / total;
  const formality = Math.max(0, Math.min(1, 0.35 + longFormRate * 0.5 + (1 - lowercase) * 0.25 - humor * 0.45 - profanity * 0.3));
  return {
    humor: Number(humor.toFixed(3)),
    formality: Number(formality.toFixed(3)),
    questionRate: Number(questions.toFixed(3)),
    exclamation: Number(exclamation.toFixed(3)),
    lowercase: Number(lowercase.toFixed(3)),
    profanity: Number(profanity.toFixed(3)),
    emoji: Number(emoji.toFixed(3)),
    avgTitleWords: Number(words.toFixed(1)),
    selfPostRate: Number(selfPostRate.toFixed(3)),
    spoilerRate: Number(spoilerRate.toFixed(3)),
  };
}

function formatMixOf(posts: RawRedditPost[]): FormatMix {
  const total = posts.length || 1;
  let text = 0;
  let image = 0;
  let link = 0;
  let video = 0;
  let poll = 0;
  for (const post of posts) {
    if (post.poll) poll += 1;
    else if (post.isVideo || post.postHint === 'hosted:video' || post.postHint === 'rich:video') video += 1;
    else if (post.isGallery || post.postHint === 'image') image += 1;
    else if (post.isSelf) text += 1;
    else link += 1;
  }
  const round = (value: number) => Number((value / total).toFixed(3));
  return { text: round(text), image: round(image), link: round(link), video: round(video), poll: round(poll) };
}

export function analyseSnapshot(snapshot: SubredditSnapshot, source: CultureProfile['source'] = 'live'): CultureProfile {
  const now = Date.now();
  const posts = snapshot.posts.filter(post => post.title);
  const about = snapshot.about;

  /* ---- term statistics -------------------------------------------- */
  const termWeight = new Map<string, number>();
  const termCount = new Map<string, number>();
  const termPosts = new Map<string, Set<number>>();
  const recentWeight = new Map<string, number>();
  const casings = new Map<string, Map<string, number>>();
  const capitalEvidence = new Map<string, { capped: number; total: number }>();
  const bigrams = new Map<string, number>();
  const capitalRuns = new Map<string, number>();
  let recentTotal = 0;
  let overallTotal = 0;

  posts.forEach((post, index) => {
    const weight = weightOf(post, now);
    const ageHours = (now / 1000 - post.createdUtc) / HOUR;
    const isRecent = ageHours <= 36;
    overallTotal += weight;
    if (isRecent) recentTotal += weight;

    const rawWords = `${post.title} ${post.selftext.slice(0, 500)}`.split(/\s+/);
    rawWords.forEach((raw, position) => {
      const clean = raw.replace(/[^A-Za-z0-9'’\-]/g, '');
      if (clean.length < 3) return;
      const lower = clean.toLowerCase();
      if (isStopword(lower)) return;
      const forms = casings.get(lower) || new Map<string, number>();
      forms.set(clean, (forms.get(clean) || 0) + 1);
      casings.set(lower, forms);
      if (position > 0) {
        const evidence = capitalEvidence.get(lower) || { capped: 0, total: 0 };
        evidence.total += 1;
        if (/^[A-Z][a-z']/.test(clean)) evidence.capped += 1;
        capitalEvidence.set(lower, evidence);
      }
    });

    // Runs of capitalised words often name the thing a community keeps discussing.
    const runs = post.title.match(/\b([A-Z][a-z'’]{2,}(?:\s+(?:of|the|and)?\s*[A-Z][a-z'’]{2,}){1,2})\b/g) || [];
    for (const run of runs) {
      const key = run.trim();
      if (key.split(/\s+/).length < 2) continue;
      capitalRuns.set(key, (capitalRuns.get(key) || 0) + 1);
    }

    const tokens = tokenize(`${post.title} ${post.selftext.slice(0, 400)}`);
    const unique = new Set(tokens);
    for (const token of unique) {
      termWeight.set(token, (termWeight.get(token) || 0) + weight);
      termCount.set(token, (termCount.get(token) || 0) + 1);
      if (isRecent) recentWeight.set(token, (recentWeight.get(token) || 0) + weight);
      const bucket = termPosts.get(token) || new Set<number>();
      bucket.add(index);
      termPosts.set(token, bucket);
    }
    const titleTokens = tokenize(post.title);
    for (let i = 0; i < titleTokens.length - 1; i++) {
      const pair = `${titleTokens[i]} ${titleTokens[i + 1]}`;
      bigrams.set(pair, (bigrams.get(pair) || 0) + 1);
    }
  });

  /* ---- entities, phrases, slang ------------------------------------ */
  const entities = Array.from(capitalEvidence.entries())
    .filter(([term, evidence]) => evidence.total >= 2 && evidence.capped / evidence.total > 0.6 && (termCount.get(term) || 0) >= 2)
    .map(([term]) => ({ term: titleCase(term, casings), count: termCount.get(term) || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 28);

  const phrases = [
    ...Array.from(capitalRuns.entries())
      .filter(([, count]) => count >= 2)
      .map(([term, count]) => ({ term, count: count * 2 })),
    ...Array.from(bigrams.entries())
      .filter(([, count]) => count >= 3)
      .map(([term, count]) => ({ term, count })),
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);

  const entityLower = new Set(entities.map(entity => entity.term.toLowerCase()));
  const slang = Array.from(termCount.entries())
    .filter(([term, count]) => count >= 3 && !COMMON.has(term) && !entityLower.has(term) && term.length >= 3 && term.length <= 16)
    .sort((a, b) => (termWeight.get(b[0]) || 0) - (termWeight.get(a[0]) || 0))
    .slice(0, 22)
    .map(([term]) => titleCase(term, casings));

  /* ---- topic clusters ---------------------------------------------- */
  const seeds = Array.from(termWeight.entries())
    .filter(([term]) => (termCount.get(term) || 0) >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 48);

  type Draft = { terms: string[]; posts: Set<number>; weight: number };
  const drafts: Draft[] = [];
  for (const [term, weight] of seeds) {
    const bucket = termPosts.get(term);
    if (!bucket || bucket.size < 2) continue;
    const match = drafts.find(draft => jaccard(draft.posts, bucket) > 0.42);
    if (match) {
      match.terms.push(term);
      for (const index of bucket) match.posts.add(index);
      match.weight += weight * 0.6;
    } else {
      drafts.push({ terms: [term], posts: new Set(bucket), weight });
    }
  }

  const maxWeight = drafts.reduce((max, draft) => Math.max(max, draft.weight), 1);
  const topics: TopicCluster[] = drafts
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 14)
    .map((draft, index) => {
      const clusterPosts = Array.from(draft.posts).map(i => posts[i]).filter(Boolean);
      const kinds = new Map<TopicCluster['kind'], number>();
      for (const post of clusterPosts) {
        const kind = classify(post);
        kinds.set(kind, (kinds.get(kind) || 0) + 1);
      }
      const kind = Array.from(kinds.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
      const recentShare = clusterPosts.filter(post => (now / 1000 - post.createdUtc) / HOUR <= 36).length / (clusterPosts.length || 1);
      const baseline = recentTotal / (overallTotal || 1);
      const momentum: TopicCluster['momentum'] =
        recentShare > baseline * 1.25 ? 'rising' : recentShare < baseline * 0.6 ? 'fading' : 'steady';

      const labelTerms = draft.terms.slice(0, 3).map(term => titleCase(term, casings));
      const clusterEntities = Array.from(
        new Set(
          clusterPosts
            .flatMap(post => post.title.match(/\b[A-Z][a-z'’]{2,}\b/g) || [])
            .filter(word => entityLower.has(word.toLowerCase())),
        ),
      ).slice(0, 6);

      return {
        id: `t${index}-${draft.terms[0]}`,
        label: labelTerms.slice(0, 2).join(' + '),
        terms: labelTerms,
        entities: clusterEntities,
        heat: Number(Math.max(0.05, draft.weight / maxWeight).toFixed(3)),
        momentum,
        kind,
        mentions: clusterPosts.length,
      };
    });

  /* ---- rising terms -------------------------------------------------- */
  const recentShareBase = recentTotal / (overallTotal || 1) || 0.4;
  const rising = Array.from(recentWeight.entries())
    .filter(([term, weight]) => {
      const total = termWeight.get(term) || weight;
      return (termCount.get(term) || 0) >= 2 && weight / total > Math.min(0.92, recentShareBase * 1.6);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => titleCase(term, casings));

  /* ---- flairs & recurring threads ------------------------------------ */
  const flairCounts = new Map<string, number>();
  for (const post of posts) {
    const flair = post.flair.trim();
    if (!flair || flair.length > 28) continue;
    flairCounts.set(flair, (flairCounts.get(flair) || 0) + 1);
  }
  const flairs = Array.from(flairCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count]) => ({ text, count }));

  const recurringThreads = Array.from(
    new Set(
      posts
        .filter(post => post.stickied || RECURRING.test(post.title))
        .map(post => post.title.replace(/[-–—:|].*$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim())
        .filter(title => title.length > 6 && title.length < 60),
    ),
  ).slice(0, 5);

  const tone = toneOf(posts);
  const formatMix = formatMixOf(posts);

  /* ---- readable notes for the UI -------------------------------------- */
  const notes: string[] = [];
  if (topics[0]) notes.push(`Most attention right now: ${topics[0].label}`);
  const risingTopic = topics.find(topic => topic.momentum === 'rising');
  if (risingTopic) notes.push(`Gaining traction: ${risingTopic.label}`);
  if (tone.humor > 0.3) notes.push('Heavily meme-driven right now');
  else if (tone.formality > 0.6) notes.push('Long-form, discussion-led tone');
  if (formatMix.image + formatMix.video > 0.55) notes.push('Mostly visual posts');
  else if (formatMix.text > 0.6) notes.push('Mostly text posts');
  if (recurringThreads.length) notes.push(`Recurring: ${recurringThreads[0]}`);

  const windowHours = posts.length
    ? Math.round((now / 1000 - Math.min(...posts.map(post => post.createdUtc))) / HOUR)
    : 0;

  return {
    subreddit: about?.name || '',
    displayName: about?.displayName || `r/${about?.name || ''}`,
    title: about?.title || '',
    description: about?.publicDescription || about?.description.slice(0, 280) || '',
    source,
    fetchedAt: snapshot.fetchedAt,
    windowHours,
    sampleSize: posts.length,
    subscribers: about?.subscribers || 0,
    activeUsers: about?.activeUsers || 0,
    over18: about?.over18 || false,
    primaryColor: about?.primaryColor || undefined,
    topics,
    entities,
    phrases,
    slang,
    rising,
    flairs,
    formatMix,
    tone,
    recurringThreads,
    notes,
    transport: snapshot.transport,
  };
}
