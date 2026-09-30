/**
 * Offline / estimated culture profiles.
 *
 * When live Reddit context cannot be reached (network blocked, CORS, rate
 * limits, private sub) we still want a believable simulation. These profiles
 * are built from durable, slow-moving knowledge about a community — long-lived
 * subject matter, not "what is trending today" — and everything produced from
 * them is clearly labelled as estimated rather than live.
 */

import type { CommunityProfile, CultureProfile, FormatMix, ToneSignals, TopicCluster } from '../types';

type Pack = {
  match: RegExp;
  category: string;
  title: string;
  description: string;
  entities: string[];
  slang: string[];
  topics: string[];
  flairs: string[];
  recurring?: string[];
  tone?: Partial<ToneSignals>;
  format?: Partial<FormatMix>;
};

const GENERIC_FLAIRS = ['Discussion', 'Question', 'Meta'];

/** Durable subject-matter packs for widely known communities. */
const PACKS: Pack[] = [
  {
    match: /^(deltarune)$/i,
    category: 'Gaming',
    title: 'Deltarune',
    description: 'Discussion, theories, art, and jokes about Toby Fox\'s Deltarune.',
    entities: ['Kris', 'Susie', 'Ralsei', 'Noelle', 'Berdly', 'Spamton', 'Jevil', 'Lancer', 'Queen', 'Toriel', 'Papyrus', 'Sans', 'the Knight', 'Gaster', 'Tenna', 'the Roaring', 'Dark World', 'Light World', 'Titans'],
    slang: ['lore', 'route', 'foreshadowing', 'snowgrave', 'weird route', 'chapter', 'soul', 'fountain', 'sprite', 'headcanon', 'canon'],
    topics: ['Knight theories', 'chapter speculation', 'character dynamics', 'the soundtrack', 'fan art', 'Undertale parallels'],
    flairs: ['Theory', 'Discussion', 'Art', 'Meme', 'Question', 'Spoilers'],
    tone: { humor: 0.42, formality: 0.35, lowercase: 0.3, spoilerRate: 0.35 },
    format: { image: 0.45, text: 0.4, link: 0.1, video: 0.05 },
  },
  {
    match: /^(undertale)$/i,
    category: 'Gaming',
    title: 'Undertale',
    description: 'The community around Undertale — routes, characters, music, and endless jokes.',
    entities: ['Sans', 'Papyrus', 'Frisk', 'Chara', 'Toriel', 'Undyne', 'Alphys', 'Asgore', 'Flowey', 'Mettaton', 'Asriel'],
    slang: ['pacifist', 'genocide route', 'determination', 'LOVE', 'megalovania', 'reset', 'timeline'],
    topics: ['routes', 'character analysis', 'fan art', 'music appreciation', 'Deltarune connections'],
    flairs: ['Discussion', 'Art', 'Theory', 'Meme', 'Question'],
    tone: { humor: 0.45, formality: 0.3, lowercase: 0.32 },
    format: { image: 0.5, text: 0.35, link: 0.1 },
  },
  {
    match: /^(eldenring|eldenringbuilds|shadowoftheerdtree)$/i,
    category: 'Gaming',
    title: 'Elden Ring',
    description: 'Builds, boss fights, lore, and cooperative suffering in the Lands Between.',
    entities: ['Malenia', 'Radahn', 'Miquella', 'Ranni', 'Margit', 'Melina', 'Messmer', 'Erdtree', 'Tarnished', 'Marika'],
    slang: ['build', 'scaling', 'poise', 'invader', 'summon sign', 'rune level', 'jump attack', 'colossal', 'bleed', 'no-hit'],
    topics: ['build theorycrafting', 'boss difficulty', 'lore', 'co-op', 'the DLC'],
    flairs: ['Discussion', 'Lore', 'Build', 'Humor', 'Question'],
    tone: { humor: 0.3, formality: 0.4 },
    format: { image: 0.4, text: 0.4, video: 0.15 },
  },
  {
    match: /^(minecraft|minecraftbuilds)$/i,
    category: 'Gaming',
    title: 'Minecraft',
    description: 'Builds, redstone, survival worlds, and updates.',
    entities: ['Creeper', 'Enderman', 'Nether', 'End', 'Villager', 'Redstone', 'Warden', 'Mojang'],
    slang: ['survival world', 'seed', 'farm', 'redstone', 'mob', 'render distance', 'hardcore', 'speedrun'],
    topics: ['builds', 'redstone', 'survival worlds', 'snapshots', 'seeds'],
    flairs: ['Builds', 'Survival', 'Redstone', 'Help', 'Discussion'],
    format: { image: 0.62, text: 0.2, video: 0.12 },
  },
  {
    match: /^(stardewvalley)$/i,
    category: 'Gaming',
    title: 'Stardew Valley',
    description: 'Farm layouts, villagers, and cozy min-maxing.',
    entities: ['Pelican Town', 'Junimo', 'Sebastian', 'Abigail', 'Haley', 'Shane', 'Joja', 'ConcernedApe'],
    slang: ['farm layout', 'community center', 'perfection', 'ginger island', 'heart events', 'iridium'],
    topics: ['farm layouts', 'marriage candidates', 'updates', 'first-year runs'],
    flairs: ['Screenshot', 'Discussion', 'Question', 'Art'],
    format: { image: 0.6, text: 0.28 },
  },
  {
    match: /^(baldursgate3|bg3)$/i,
    category: 'Gaming',
    title: "Baldur's Gate 3",
    description: 'Party builds, companion romances, and improbable dice rolls.',
    entities: ['Astarion', 'Shadowheart', 'Karlach', 'Lae\'zel', 'Gale', 'Withers', 'Larian'],
    slang: ['honour mode', 'multiclass', 'nat 20', 'party comp', 'origin run', 'tadpole'],
    topics: ['builds', 'companion approval', 'honour mode', 'patches'],
    flairs: ['Discussion', 'Build Help', 'Screenshot', 'Meme'],
    format: { image: 0.45, text: 0.4 },
  },
  {
    match: /^(programming|coding|softwareengineering|experienceddevs)$/i,
    category: 'Programming',
    title: 'Programming',
    description: 'Software engineering discussion, tooling, and the realities of shipping code.',
    entities: ['Rust', 'Python', 'TypeScript', 'Go', 'Linux', 'Git', 'Postgres', 'Kubernetes'],
    slang: ['tech debt', 'refactor', 'code review', 'on-call', 'legacy', 'CI', 'benchmark', 'abstraction'],
    topics: ['language design', 'AI tooling', 'hiring', 'architecture', 'postmortems'],
    flairs: ['Discussion', 'Article', 'Question', 'Showcase'],
    tone: { formality: 0.68, humor: 0.14 },
    format: { link: 0.45, text: 0.45 },
  },
  {
    match: /^(webdev|frontend|reactjs|javascript|node)$/i,
    category: 'Programming',
    title: 'Web development',
    description: 'Front-end, back-end, and the churn in between.',
    entities: ['React', 'Next.js', 'Vite', 'Tailwind', 'TypeScript', 'Node'],
    slang: ['bundle size', 'hydration', 'SSR', 'a11y', 'DX', 'framework churn'],
    topics: ['framework churn', 'portfolios', 'freelance rates', 'CSS tricks', 'performance'],
    flairs: ['Showoff Saturday', 'Question', 'Discussion', 'Resource'],
    format: { link: 0.35, text: 0.45, image: 0.15 },
  },
  {
    match: /^(learnprogramming|cscareerquestions|cscareerquestionsEU)$/i,
    category: 'Career',
    title: 'Learning to code',
    description: 'Beginners, career changers, and the long road to a first job.',
    entities: ['LeetCode', 'Python', 'JavaScript', 'GitHub'],
    slang: ['tutorial hell', 'roadmap', 'portfolio', 'imposter syndrome', 'take-home', 'referral'],
    topics: ['study routines', 'the job search', 'project ideas', 'burnout', 'the market'],
    flairs: ['Question', 'Advice', 'Resource', 'Meta'],
    tone: { formality: 0.6, questionRate: 0.6 },
    format: { text: 0.85 },
  },
  {
    match: /^(personalfinance|frugal|povertyfinance|financialindependence)$/i,
    category: 'Personal finance',
    title: 'Personal finance',
    description: 'Budgets, debt payoff, and building a plan that survives real life.',
    entities: ['Roth IRA', '401k', 'HYSA', 'FICO'],
    slang: ['emergency fund', 'sinking fund', 'employer match', 'expense ratio', 'snowball', 'runway'],
    topics: ['emergency funds', 'debt payoff', 'first salaries', 'housing'],
    flairs: ['Budgeting', 'Debt', 'Investing', 'Housing', 'Other'],
    tone: { formality: 0.72, humor: 0.05 },
    format: { text: 0.92 },
  },
  {
    match: /^(cooking|food|askculinary|budgetfood|cookingforbeginners)$/i,
    category: 'Food',
    title: 'Cooking',
    description: 'Weeknight dinners, technique questions, and dishes worth repeating.',
    entities: ['Dutch oven', 'Maillard', 'Kenji'],
    slang: ['mise en place', 'fond', 'deglaze', 'sear', 'weeknight', 'batch cook', 'pantry'],
    topics: ['technique', 'pantry meals', 'knives and pans', 'family recipes'],
    flairs: ['Recipe', 'Question', 'Technique', 'Photo'],
    format: { image: 0.45, text: 0.45 },
  },
  {
    match: /^(movies|truefilm|flicks)$/i,
    category: 'Movies & TV',
    title: 'Movies',
    description: 'Reviews, close readings, and arguments about the third act.',
    entities: ['A24', 'Nolan', 'Villeneuve', 'IMAX', 'Cannes'],
    slang: ['third act', 'needle drop', 'blocking', 'letterboxd', 'box office', 'practical effects'],
    topics: ['new releases', 'directors', 'awards season', 'underrated picks'],
    flairs: ['Discussion', 'Review', 'Trailer', 'News'],
    format: { link: 0.4, text: 0.45 },
  },
  {
    match: /^(askreddit|casualconversation|nostupidquestions)$/i,
    category: 'Discussion',
    title: 'Open questions',
    description: 'Open-ended questions to the room and the stories they pull out of people.',
    entities: [],
    slang: ['serious replies', 'edit: wow', 'hivemind', 'anecdote'],
    topics: ['hypotheticals', 'life experiences', 'small confessions', 'shared annoyances'],
    flairs: GENERIC_FLAIRS,
    tone: { questionRate: 0.92, formality: 0.4, humor: 0.3 },
    format: { text: 0.98 },
  },
  {
    match: /^(anime|manga|animemes)$/i,
    category: 'Anime',
    title: 'Anime',
    description: 'Seasonal watching, adaptations, and recommendation chains.',
    entities: ['Studio Ghibli', 'MAPPA', 'Shonen Jump', 'Crunchyroll'],
    slang: ['seasonal', 'adaptation', 'sakuga', 'filler', 'arc', 'sub vs dub', 'manga reader'],
    topics: ['the seasonal lineup', 'adaptations', 'recommendations', 'animation'],
    flairs: ['Discussion', 'Recommendation', 'News', 'Clip'],
    format: { image: 0.35, text: 0.35, video: 0.15, link: 0.15 },
  },
  {
    match: /^(fitness|bodyweightfitness|xxfitness|running|weightroom)$/i,
    category: 'Fitness',
    title: 'Fitness',
    description: 'Programming, plateaus, and training that survives a real schedule.',
    entities: ['5/3/1', 'Starting Strength', 'RPE'],
    slang: ['deload', 'progressive overload', 'volume', 'PR', 'form check', 'cutting', 'bulking'],
    topics: ['programming', 'plateaus', 'recovery', 'coming back after a break'],
    flairs: ['Form Check', 'Question', 'Progress', 'Discussion'],
    tone: { formality: 0.6 },
    format: { text: 0.75, image: 0.15 },
  },
  {
    match: /^(science|askscience|space|physics)$/i,
    category: 'Science',
    title: 'Science',
    description: 'New findings, methodology, and correcting the headline.',
    entities: ['NASA', 'JWST', 'peer review', 'Nature'],
    slang: ['sample size', 'effect size', 'confound', 'preprint', 'replication', 'p-value'],
    topics: ['study interpretation', 'science communication', 'methodology', 'new instruments'],
    flairs: ['Biology', 'Physics', 'Health', 'Discussion'],
    tone: { formality: 0.85, humor: 0.08 },
    format: { link: 0.55, text: 0.35 },
  },
  {
    match: /^(mildlyinteresting|mildlyinfuriating|oddlysatisfying|interestingasfuck)$/i,
    category: 'Curiosities',
    title: 'Small observations',
    description: 'Photos of things that are slightly more interesting than they should be.',
    entities: [],
    slang: ['found this', 'at my local', 'the way', 'this specific'],
    topics: ['packaging', 'signage', 'wear patterns', 'coincidences'],
    flairs: GENERIC_FLAIRS,
    tone: { humor: 0.3, formality: 0.25 },
    format: { image: 0.86, text: 0.08 },
  },
  {
    match: /^(showerthoughts|crazyideas|philosophy)$/i,
    category: 'Discussion',
    title: 'Shower thoughts',
    description: 'One-sentence realisations that feel profound for about nine seconds.',
    entities: [],
    slang: ['technically', 'basically', 'kind of'],
    topics: ['language quirks', 'everyday paradoxes', 'reframed facts'],
    flairs: GENERIC_FLAIRS,
    tone: { humor: 0.4, formality: 0.3 },
    format: { text: 0.97 },
  },
  {
    match: /^(todayilearned|til|damnthatsinteresting)$/i,
    category: 'Learning',
    title: 'Today I learned',
    description: 'Facts with a source and an argument in the comments.',
    entities: [],
    slang: ['TIL', 'source', 'citation', 'actually'],
    topics: ['history', 'trivia', 'legal oddities', 'etymology'],
    flairs: GENERIC_FLAIRS,
    tone: { formality: 0.6 },
    format: { link: 0.85, text: 0.1 },
  },
  {
    match: /^(formula1|nba|soccer|nfl|baseball|cricket)$/i,
    category: 'Sports',
    title: 'Sports',
    description: 'Match threads, transfer rumours, and takes that age in minutes.',
    entities: [],
    slang: ['match thread', 'highlight', 'roster', 'trade', 'standings', 'clutch'],
    topics: ['post-match reaction', 'roster moves', 'predictions', 'officiating'],
    flairs: ['Discussion', 'News', 'Highlight', 'Match Thread'],
    tone: { humor: 0.28 },
    format: { link: 0.4, text: 0.3, video: 0.2 },
  },
  {
    match: /^(mechanicalkeyboards|keyboards|battlestations|pcmasterrace|buildapc)$/i,
    category: 'Hobbies',
    title: 'Builds and setups',
    description: 'Parts lists, photos, and gently competitive spending.',
    entities: [],
    slang: ['endgame', 'build', 'parts list', 'sound test', 'daily driver', 'cable management'],
    topics: ['builds', 'buying advice', 'first builds', 'aesthetics'],
    flairs: ['Build', 'Help', 'Discussion', 'Photos'],
    format: { image: 0.6, text: 0.28 },
  },
  {
    match: /^(aww|cats|dogs|catsstandingup|rarepuppers)$/i,
    category: 'Animals',
    title: 'Animals',
    description: 'Pets doing pet things, captioned affectionately.',
    entities: [],
    slang: ['tax', 'floof', 'boop', 'zoomies', 'derp'],
    topics: ['adoptions', 'pet behaviour', 'before and after', 'naming'],
    flairs: GENERIC_FLAIRS,
    tone: { humor: 0.35, formality: 0.2, exclamation: 0.4 },
    format: { image: 0.8, video: 0.12 },
  },
];

const CATEGORY_HINTS: { match: RegExp; category: string; topics: string[]; slang: string[]; flairs: string[]; tone?: Partial<ToneSignals>; format?: Partial<FormatMix> }[] = [
  {
    match: /(meme|jerk|shitpost|humor|funny|dank)/i,
    category: 'Memes',
    topics: ['the recurring in-joke', 'new formats', 'reaction chains', 'meta jokes'],
    slang: ['format', 'repost', 'low effort', 'top comment'],
    flairs: ['Meme', 'Shitpost', 'OC'],
    tone: { humor: 0.8, formality: 0.15, lowercase: 0.5 },
    format: { image: 0.75, text: 0.15 },
  },
  {
    match: /(help|support|advice|question|ask)/i,
    category: 'Advice',
    topics: ['troubleshooting', 'first-timer questions', 'follow-up updates'],
    slang: ['solved', 'update', 'any ideas', 'tried everything'],
    flairs: ['Help', 'Solved', 'Question'],
    tone: { questionRate: 0.75, formality: 0.55 },
    format: { text: 0.85 },
  },
  {
    match: /(art|draw|paint|design|photo|pics|porn|craft|sewing|knit)/i,
    category: 'Art',
    topics: ['works in progress', 'critique', 'tools and materials', 'finished pieces'],
    slang: ['WIP', 'OC', 'critique welcome', 'first attempt'],
    flairs: ['OC', 'Critique', 'Question'],
    format: { image: 0.8, text: 0.12 },
  },
  {
    match: /(game|gaming|rpg|fps|nintendo|playstation|xbox|steam)/i,
    category: 'Gaming',
    topics: ['patches', 'strategy', 'screenshots', 'difficulty'],
    slang: ['patch', 'meta', 'grind', 'endgame', 'nerf', 'buff'],
    flairs: ['Discussion', 'Question', 'Media', 'Meme'],
    tone: { humor: 0.35 },
    format: { image: 0.4, text: 0.35, video: 0.15 },
  },
  {
    match: /(dev|code|program|tech|linux|data|sysadmin|security|ai|ml)/i,
    category: 'Technology',
    topics: ['tooling', 'careers', 'projects', 'best practices'],
    slang: ['stack', 'workflow', 'config', 'benchmark', 'edge case'],
    flairs: ['Discussion', 'Question', 'Showcase'],
    tone: { formality: 0.68, humor: 0.15 },
    format: { text: 0.55, link: 0.35 },
  },
  {
    match: /(city|country|travel|europe|india|london|nyc|toronto|australia)/i,
    category: 'Places',
    topics: ['local recommendations', 'moving here', 'transit', 'weekend plans'],
    slang: ['locals', 'downtown', 'commute', 'hidden gem'],
    flairs: ['Question', 'Discussion', 'Photo', 'News'],
    format: { text: 0.6, image: 0.25, link: 0.15 },
  },
];

function splitCamel(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEFAULT_TONE: ToneSignals = {
  humor: 0.25,
  formality: 0.45,
  questionRate: 0.3,
  exclamation: 0.1,
  lowercase: 0.18,
  profanity: 0.08,
  emoji: 0.05,
  avgTitleWords: 9.5,
  selfPostRate: 0.55,
  spoilerRate: 0.05,
};

const DEFAULT_FORMAT: FormatMix = { text: 0.5, image: 0.3, link: 0.14, video: 0.04, poll: 0.02 };

function buildTopics(labels: string[], entities: string[], kinds: TopicCluster['kind'][]): TopicCluster[] {
  return labels.map((label, index) => ({
    id: `off-${index}-${label.replace(/\s+/g, '-').toLowerCase()}`,
    label,
    terms: label.split(/\s+/).filter(word => word.length > 3).slice(0, 3),
    entities: entities.slice(index * 2, index * 2 + 3),
    heat: Number(Math.max(0.2, 1 - index * 0.13).toFixed(2)),
    momentum: index === 1 ? 'rising' : index > 3 ? 'fading' : 'steady',
    kind: kinds[index % kinds.length],
    mentions: Math.max(2, 14 - index * 2),
  }));
}

/** Build an estimated profile for any subreddit name. */
export function estimatedProfile(rawName: string): CultureProfile {
  const name = rawName.replace(/^r\//i, '');
  const pack = PACKS.find(item => item.match.test(name));
  const hint = !pack ? CATEGORY_HINTS.find(item => item.match.test(name)) : undefined;
  const readable = splitCamel(name);

  const entities = pack?.entities?.length ? pack.entities : [readable];
  const slang = pack?.slang || hint?.slang || ['discussion', 'thread', 'community'];
  const topicLabels = pack?.topics || hint?.topics || [
    `${readable} discussion`,
    `${readable} questions`,
    `${readable} showcases`,
    `${readable} opinions`,
    'community meta',
  ];
  const flairs = pack?.flairs || hint?.flairs || GENERIC_FLAIRS;
  const tone = { ...DEFAULT_TONE, ...(hint?.tone || {}), ...(pack?.tone || {}) };
  const format = { ...DEFAULT_FORMAT, ...(hint?.format || {}), ...(pack?.format || {}) };

  return {
    subreddit: name,
    displayName: `r/${name}`,
    title: pack?.title || readable,
    description: pack?.description || `A simulated community inspired by r/${name}.`,
    source: 'offline',
    fetchedAt: Date.now(),
    windowHours: 0,
    sampleSize: 0,
    subscribers: 0,
    activeUsers: 0,
    over18: false,
    topics: buildTopics(topicLabels, entities, ['general', 'question', 'media', 'theory', 'meme', 'news']),
    entities: entities.map((term, index) => ({ term, count: Math.max(2, 12 - index) })),
    phrases: topicLabels.slice(0, 5).map((term, index) => ({ term, count: 6 - index })),
    slang,
    rising: [],
    flairs: flairs.map((text, index) => ({ text, count: 10 - index })),
    formatMix: format,
    tone,
    recurringThreads: pack?.recurring || [],
    notes: [
      'Estimated profile — live Reddit context was unavailable.',
      'Generated posts use durable subject matter rather than current trends.',
    ],
    category: pack?.category || hint?.category || 'Community',
  };
}

/** Convert a hand-authored community into the same shape the generator consumes. */
export function profileFromCommunity(community: CommunityProfile): CultureProfile {
  const topics = buildTopics(
    community.commonTopics.concat(community.recurringThemes).slice(0, 7),
    community.vocabulary,
    ['general', 'question', 'theory', 'media', 'news', 'help'],
  );
  return {
    subreddit: community.sourceSubreddit || community.id,
    displayName: community.name,
    title: community.displayName,
    description: community.description,
    source: 'builtin',
    fetchedAt: Date.now(),
    windowHours: 0,
    sampleSize: 0,
    subscribers: community.members,
    activeUsers: community.online,
    over18: false,
    topics,
    entities: community.vocabulary.map((term, index) => ({ term, count: 10 - index })),
    phrases: community.commonOpinions.map((term, index) => ({ term, count: 6 - index })),
    slang: community.vocabulary,
    rising: community.recurringThemes.slice(0, 3),
    flairs: community.preferredFormats.map((text, index) => ({
      text: text.replace(/\b\w/g, char => char.toUpperCase()).split(' ').slice(0, 2).join(' '),
      count: 8 - index,
    })),
    formatMix: DEFAULT_FORMAT,
    tone: {
      ...DEFAULT_TONE,
      humor: /playful|funny|chaotic|absurd|joke/i.test(community.tone) ? 0.5 : 0.2,
      formality: /precise|evidence|technical|calm|careful/i.test(community.tone) ? 0.7 : 0.45,
    },
    recurringThreads: community.recurringThemes,
    notes: ['Built-in community profile — connect live context to track the real subreddit.'],
  };
}
