/**
 * The on-device generation engine.
 *
 * Takes a CultureProfile (what the real community is currently circling around)
 * and writes *new* posts: theories, jokes, questions, meme concepts, hot takes,
 * showcases, meta threads. Nothing here copies source text — the profile only
 * carries terms, names, tone measurements and format ratios, and every sentence
 * is assembled locally from those signals.
 *
 * Variety comes from combinatorics (archetype x topic x subject x phrasing x
 * body shape) plus a novelty ledger, and the feed drifts as you scroll: later
 * batches mix topics together and reach for colder material, which is what
 * makes an endless feed stop feeling like a loop.
 */

import type {
  Comment,
  CommunityProfile,
  CultureProfile,
  MemeConcept,
  Post,
  TopicCluster,
} from '../types';

/* ------------------------------------------------------------------ */
/* Randomness helpers                                                  */
/* ------------------------------------------------------------------ */

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return Math.abs(h >>> 0);
}

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length) % items.length];
const chance = (rng: Rng, probability: number) => rng() < probability;
const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
const intBetween = (rng: Rng, min: number, max: number) => Math.floor(between(rng, min, max + 1));

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T, index: number) => number): T {
  const weights = items.map(weight).map(value => (Number.isFinite(value) && value > 0 ? value : 0.0001));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/* ------------------------------------------------------------------ */
/* Lexicon                                                             */
/* ------------------------------------------------------------------ */

interface Lexicon {
  thing: string;
  things: string;
  maker: string;
  artifact: string;
  event: string;
  verb: string;
  place: string;
}

const LEXICONS: Record<string, Lexicon> = {
  gaming: { thing: 'run', things: 'runs', maker: 'the devs', artifact: 'build', event: 'update', verb: 'played', place: 'the game' },
  fandom: { thing: 'scene', things: 'scenes', maker: 'the writers', artifact: 'theory', event: 'chapter', verb: 'watched', place: 'the story' },
  tech: { thing: 'project', things: 'projects', maker: 'maintainers', artifact: 'setup', event: 'release', verb: 'shipped', place: 'the codebase' },
  food: { thing: 'dish', things: 'dishes', maker: 'the recipe author', artifact: 'method', event: 'weeknight', verb: 'cooked', place: 'the kitchen' },
  fitness: { thing: 'session', things: 'sessions', maker: 'the coach', artifact: 'program', event: 'training block', verb: 'trained', place: 'the gym' },
  finance: { thing: 'plan', things: 'plans', maker: 'the calculator', artifact: 'budget', event: 'month', verb: 'tracked', place: 'the spreadsheet' },
  art: { thing: 'piece', things: 'pieces', maker: 'the artist', artifact: 'sketch', event: 'session', verb: 'drew', place: 'the canvas' },
  science: { thing: 'study', things: 'studies', maker: 'the authors', artifact: 'dataset', event: 'preprint', verb: 'read', place: 'the literature' },
  sports: { thing: 'match', things: 'matches', maker: 'the coaching staff', artifact: 'lineup', event: 'season', verb: 'watched', place: 'the league' },
  hobby: { thing: 'build', things: 'builds', maker: 'the vendor', artifact: 'setup', event: 'group buy', verb: 'assembled', place: 'the desk' },
  advice: { thing: 'situation', things: 'situations', maker: 'everyone involved', artifact: 'plan', event: 'conversation', verb: 'handled', place: 'real life' },
  general: { thing: 'thing', things: 'things', maker: 'whoever made it', artifact: 'post', event: 'week', verb: 'saw', place: 'here' },
};

function lexiconFor(profile: CultureProfile): Lexicon {
  const haystack = [
    profile.category || '',
    profile.title,
    profile.description,
    profile.slang.join(' '),
    profile.topics.map(topic => topic.label).join(' '),
    profile.flairs.map(flair => flair.text).join(' '),
    profile.entities.slice(0, 8).map(entity => entity.term).join(' '),
  ].join(' ').toLowerCase();
  if (/\b(game|gaming|rpg|boss|player|speedrun|console)\b/.test(haystack)) return LEXICONS.gaming;
  if (/\b(anime|manga|show|series|film|movie|episode|character|lore|fandom|chapter|spoilers?|canon|headcanon)\b/.test(haystack)) return LEXICONS.fandom;
  if (/\b(program|code|dev|software|tech|linux|data|engineer)\b/.test(haystack)) return LEXICONS.tech;
  if (/\b(cook|food|recipe|bake|kitchen|culinary)\b/.test(haystack)) return LEXICONS.food;
  if (/\b(fitness|lift|run|train|gym|workout)\b/.test(haystack)) return LEXICONS.fitness;
  if (/\b(finance|money|budget|invest|debt|salary)\b/.test(haystack)) return LEXICONS.finance;
  if (/\b(art|draw|paint|design|photo|craft)\b/.test(haystack)) return LEXICONS.art;
  if (/\b(science|research|study|physics|biology)\b/.test(haystack)) return LEXICONS.science;
  if (/\b(sport|match|team|league|season|nba|soccer)\b/.test(haystack)) return LEXICONS.sports;
  if (/\b(keyboard|build|setup|collect|hobby|model|garden)\b/.test(haystack)) return LEXICONS.hobby;
  if (/\b(advice|relationship|help|support|career)\b/.test(haystack)) return LEXICONS.advice;
  return LEXICONS.general;
}

/* ------------------------------------------------------------------ */
/* Angle: the creative brief for a single post                          */
/* ------------------------------------------------------------------ */

interface Angle {
  topic: TopicCluster;
  blend?: TopicCluster;
  subject: string;
  subject2: string;
  theme: string;
  theme2: string;
  phrase: string;
  slang: string;
  slang2: string;
  lex: Lexicon;
  profile: CultureProfile;
  rng: Rng;
  batch: number;
}

function nounPhrase(term: string): string {
  if (!term) return 'this';
  if (/^(the|a|an)\s/i.test(term)) return term;
  if (/^[A-Z]/.test(term)) return term;
  if (/s$/.test(term) && !/ss$/.test(term)) return term;
  return `the ${term}`;
}

/** Terms arrive in the casing the community actually uses; keep proper nouns intact. */
function asTerm(term: string): string {
  return term.trim();
}

function lower(term: string): string {
  return term.trim().toLowerCase();
}

/** A short handle for a term — avoids dragging a five-word cluster label into a sentence. */
function shortForm(term: string): string {
  const words = term.trim().split(/\s+/);
  if (words.length <= 2) return term.trim();
  const proper = words.find(word => /^[A-Z]/.test(word));
  return proper || words.slice(0, 2).join(' ');
}

function subjectFrom(topic: TopicCluster, profile: CultureProfile, rng: Rng, avoid?: string): string {
  const skip = (avoid || '').toLowerCase();
  const usable = (list: string[]) => list
    .map(asTerm)
    .filter(option => option && option.length > 2 && option.toLowerCase() !== skip);

  const entities = usable(topic.entities);
  const terms = usable(topic.terms.map(shortForm));
  const phrase = profile.phrases.find(item =>
    topic.terms.some(term => item.term.toLowerCase().includes(term.toLowerCase())));
  const phrases = usable(phrase ? [phrase.term] : []);
  const global = usable(profile.entities.slice(0, 5).map(entity => entity.term));

  // Named things carry a community's voice far better than cluster labels do.
  const roll = rng();
  if (entities.length && roll < 0.58) return pick(rng, entities);
  if (terms.length && roll < 0.86) return pick(rng, terms);
  if (phrases.length) return pick(rng, phrases);
  if (terms.length) return pick(rng, terms);
  if (entities.length) return pick(rng, entities);
  if (global.length) return pick(rng, global);
  return shortForm(profile.title || profile.subreddit);
}

function buildAngle(profile: CultureProfile, rng: Rng, batch: number): Angle {
  const topics = profile.topics.length ? profile.topics : [{
    id: 'fallback',
    label: profile.title || profile.subreddit,
    terms: [profile.subreddit],
    entities: [],
    heat: 1,
    momentum: 'steady' as const,
    kind: 'general' as const,
    mentions: 1,
  }];

  // Colder topics surface more often the deeper you scroll.
  const depth = Math.min(1, batch / 9);
  const topic = weightedPick(rng, topics, (item, index) => {
    const freshness = item.momentum === 'rising' ? 1.5 : item.momentum === 'fading' ? 0.7 : 1;
    const heat = Math.pow(item.heat, 1 - depth * 0.75);
    const depthBonus = 1 + depth * index * 0.25;
    return heat * freshness * depthBonus;
  });

  const blendProbability = Math.min(0.55, 0.1 + batch * 0.055);
  const others = topics.filter(item => item.id !== topic.id);
  const blend = others.length && chance(rng, blendProbability) ? pick(rng, others) : undefined;

  const subject = subjectFrom(topic, profile, rng);
  const subject2 = blend
    ? subjectFrom(blend, profile, rng, subject)
    : subjectFrom(topic, profile, rng, subject);

  const phrasePool = profile.phrases.length ? profile.phrases.map(item => item.term) : profile.slang;
  const slangPool = profile.slang.length ? profile.slang : profile.entities.map(entity => entity.term);

  const overlaps = (a: string, b: string) => {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x === y || x.includes(y) || y.includes(x);
  };
  const themeCandidates = [...topic.terms, ...(blend?.terms || []), subject].map(value => shortForm(asTerm(value)));
  const primaryTheme = themeCandidates.find(candidate => !overlaps(candidate, subject))
    || themeCandidates[0]
    || shortForm(asTerm(subject));
  const secondaryCandidates = [
    blend?.terms[0],
    topic.terms[1],
    blend?.entities[0],
    profile.entities.find(entity => !overlaps(entity.term, subject) && !overlaps(entity.term, primaryTheme))?.term,
    subject2,
  ].filter((value): value is string => Boolean(value)).map(value => shortForm(asTerm(value)));
  const secondaryTheme = secondaryCandidates.find(
    candidate => !overlaps(candidate, primaryTheme) && !overlaps(candidate, subject),
  ) || secondaryCandidates[0] || primaryTheme;

  return {
    topic,
    blend,
    subject,
    subject2,
    theme: primaryTheme,
    theme2: secondaryTheme,
    phrase: phrasePool.length ? shortForm(pick(rng, phrasePool)) : lower(subject),
    slang: slangPool.length ? pick(rng, slangPool) : 'this place',
    slang2: slangPool.length ? pick(rng, slangPool) : 'the usual',
    lex: lexiconFor(profile),
    profile,
    rng,
    batch,
  };
}

/** Resolve template slots. */
function fill(template: string, angle: Angle): string {
  const { profile } = angle;
  const map: Record<string, string> = {
    S: nounPhrase(angle.subject),
    S2: nounPhrase(angle.subject2),
    s: nounPhrase(angle.subject).toLowerCase(),
    s2: nounPhrase(angle.subject2).toLowerCase(),
    E: angle.subject,
    E2: angle.subject2,
    T: angle.theme,
    T2: angle.theme2,
    P: angle.phrase,
    G: angle.slang,
    G2: angle.slang2,
    sub: profile.displayName,
    name: profile.subreddit,
    thing: angle.lex.thing,
    things: angle.lex.things,
    maker: angle.lex.maker,
    artifact: angle.lex.artifact,
    event: angle.lex.event,
    verb: angle.lex.verb,
    place: angle.lex.place,
    N: String(intBetween(angle.rng, 2, 9)),
    NN: String(intBetween(angle.rng, 11, 80)),
    HRS: String(intBetween(angle.rng, 3, 40)),
  };
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => map[key] ?? '')
    .replace(/\b(the|a|an)\s+(?:the|a|an)\s+/gi, (_match, article: string) => `${article} `)
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sentence(rng: Rng, options: readonly string[], angle: Angle, seen?: Set<string>): string {
  if (!seen) return fill(pick(rng, options), angle);
  const fresh = options.filter(option => !seen.has(option));
  const chosen = pick(rng, fresh.length ? fresh : options);
  seen.add(chosen);
  return fill(chosen, angle);
}

/** Assemble a body from 2–4 sentence banks, skipping some for rhythm. */
function compose(angle: Angle, banks: readonly (readonly string[])[], options: { paragraphs?: boolean } = {}): string {
  const { rng } = angle;
  const parts: string[] = [];
  const seen = new Set<string>();
  banks.forEach((bank, index) => {
    if (!bank.length) return;
    if (index > 1 && chance(rng, 0.25)) return;
    parts.push(sentence(rng, bank, angle, seen));
  });
  if (!parts.length) parts.push(sentence(rng, banks[0] || ['{S} again. Thoughts?'], angle, seen));
  if (options.paragraphs && parts.length > 2) {
    const split = Math.ceil(parts.length / 2);
    return `${parts.slice(0, split).join(' ')}\n\n${parts.slice(split).join(' ')}`;
  }
  return parts.join(' ');
}

/* ------------------------------------------------------------------ */
/* Shared sentence banks                                               */
/* ------------------------------------------------------------------ */

const OPENERS = [
  'Been lurking on the {T} conversation for a while and I think we are all circling the same idea without saying it.',
  'This has been rattling around my head since the last {T} thread.',
  'Not trying to restart the whole {T} argument, but something keeps bugging me.',
  'Every time {S} comes up here it turns into the same three replies, so let me try a different angle.',
  'Long post, sorry. I have been thinking about {S} more than is reasonable.',
  'Might be obvious to everyone else, but it only clicked for me this week.',
  'Went back through {place} specifically looking at {T} and came out with a different read.',
  'I keep seeing {S} mentioned in passing and nobody seems to want to sit with it.',
  'Quick one before I lose the thought.',
  'Half-formed idea, posting it here because this is the only place it makes sense.',
];

const EVIDENCE = [
  'The pattern I notice: {S} only shows up when {T2} is already in play, which stopped feeling like a coincidence around the third time.',
  'Nobody has a clean explanation for {P}, and the boring explanation does not actually cover it.',
  'If you line up {S} and {S2} side by side, the overlap is hard to unsee.',
  'There are at least {N} moments where this is set up and then never paid off.',
  'What makes me confident is how consistent the framing is — it is never treated as a throwaway.',
  'Compare it with how {S2} gets handled. Completely different energy, same underlying idea.',
  'The detail that sells it for me is how often {T} gets mentioned right before something changes.',
  'I went looking for counterexamples and found fewer than I expected.',
];

const HEDGES = [
  'I could be reading way too much into this.',
  'Fully prepared for someone to point out the obvious thing I missed.',
  'This might just be pattern-matching on my part.',
  'Not claiming this is the only reading, just the one that holds together for me.',
  'If this has already been covered to death, point me at the thread and I will go quietly.',
];

const ASKS = [
  'Has anyone found something that kills this outright?',
  'Curious whether anyone else landed here independently.',
  'What am I missing?',
  'Would genuinely like to be argued out of it.',
  'If you disagree, I want the version with receipts.',
  'Tell me where this falls apart.',
];

const PERSONAL = [
  'For context, I have been around here about {N} months and this is the first thing I felt like writing up.',
  'I mostly {verb} on weekends so my sample size is small.',
  'Coming at this as someone who was pretty sceptical about {T} for a long time.',
  'Take this with the appropriate amount of salt — I am nowhere near the most experienced person here.',
];

/* ------------------------------------------------------------------ */
/* Archetypes                                                          */
/* ------------------------------------------------------------------ */

type Archetype = {
  id: string;
  label: string;
  type: Post['type'];
  /** Base likelihood, adjusted by tone/format signals. */
  weight: (profile: CultureProfile, angle: Angle) => number;
  titles: readonly string[];
  body?: (angle: Angle) => string;
  flairs: readonly string[];
  /** Comment personalities that suit this post. */
  voices: readonly string[];
  concept?: (angle: Angle) => MemeConcept;
  poll?: (angle: Angle) => { label: string; votes: number }[];
  /** Style the title as lowercase chatter rather than a headline. */
  casual?: boolean;
};

const ARCHETYPES: Archetype[] = [
  {
    id: 'theory',
    label: 'Theory',
    type: 'text',
    weight: (p, a) => 0.5 + p.tone.formality * 0.9 + (a.topic.kind === 'theory' ? 1.4 : 0),
    titles: [
      'Theory: {S} and {S2} are the same thread',
      'I think {S} is the key to the whole {T} thing, and I can show my work',
      'Small detail about {S} that reframes the {T} conversation',
      'Okay, hear me out: {E} leads directly to {E2}',
      '{S} makes a lot more sense if it was never really about {T2}',
      'Went back through everything and noticed something about {S}',
      'Does anyone else read {S} as setup for {T2}?',
      'The {P} thing might not be a joke',
      'Long theory post about {S} that I have been sitting on',
      'What if {S} is the answer and we have been asking the wrong question?',
      'Connecting {S} to {S2} — {N} things that line up',
      'Nobody talks about how {S} changes once you factor in {T2}',
    ],
    body: angle => compose(angle, [OPENERS, EVIDENCE, EVIDENCE, HEDGES, ASKS], { paragraphs: true }),
    flairs: ['Theory', 'Discussion', 'Analysis', 'Speculation'],
    voices: ['agree', 'counter', 'lore', 'question', 'joke'],
  },
  {
    id: 'shitpost',
    label: 'Shitpost',
    type: 'text',
    casual: true,
    weight: (p, a) => 0.3 + p.tone.humor * 2.6 + (a.topic.kind === 'meme' ? 1.2 : 0),
    titles: [
      '{s} when {T2}',
      'pov: you are {E} and {T2} just happened',
      'not to be dramatic but {P} changed me as a person',
      '{E} fans right now',
      'me explaining {T} to someone who does not care',
      'every single {T} thread, without exception',
      'nobody: absolutely nobody: this sub: {T}',
      'i have made {S} my entire personality and i regret nothing',
      'the {T} to {T2} pipeline is real and it has claimed me',
      'do not perceive me i am thinking about {s} again',
      '{E} could fix me. actually {E} would probably make it worse',
      'sorry for what i said when {T} was happening',
    ],
    body: angle => chance(angle.rng, 0.45)
      ? compose(angle, [[
        'that is the post. that is the whole thought.',
        'no further questions at this time.',
        'anyway how is everyone else doing',
        'i will not be elaborating.',
        'this took me {HRS} minutes to type and i stand by none of it',
      ]])
      : '',
    flairs: ['Shitpost', 'Meme', 'Humor', 'Low effort'],
    voices: ['joke', 'joke', 'agree', 'oneliner'],
  },
  {
    id: 'meme-concept',
    label: 'Meme concept',
    type: 'image',
    weight: (p, a) => 0.2 + (p.formatMix.image + p.formatMix.video) * 2.2 + p.tone.humor * 1.4 + (a.topic.kind === 'meme' ? 0.9 : 0),
    titles: [
      '{S} (concept)',
      'made this about the {T} situation',
      'the {T} discourse in one image',
      '{E} vs {E2}: a scientific breakdown',
      'drew {S} the way this sub describes it',
      'tier list but it is just {T} opinions',
      'the {P} starter pack',
      'was told to post this here',
      'four panels about {S} nobody asked for',
    ],
    concept: angle => {
      const { rng } = angle;
      const format = pick(rng, [
        'Two-panel reaction',
        'Four-panel comic',
        'Expanding brain',
        'Tier list',
        'Starter pack grid',
        'Drake format',
        'Labelled diagram',
        'Chart with suspicious axes',
        'Before / after split',
      ]);
      const setups = [
        'Panel one: someone confidently explaining {T} to a newcomer.',
        'Left side: the calm, reasonable take on {S}.',
        'Top: {S}, drawn heroically and slightly too detailed.',
        'A perfectly normal chart where the x-axis is "days since the last {T} thread".',
        'The setup: you finally understand {T}.',
        'Everyone gathered around {S} like it is a campfire.',
      ];
      const punchlines = [
        'Panel two: the same person {HRS} minutes later, now arguing about {S2}.',
        'Right side: {S2}, labelled only as "the problem".',
        'Bottom: {S2}, drawn in crayon, captioned "and this is fine".',
        'The y-axis is just the word "{G}" repeated until it stops being funny.',
        'The punchline: {T2} was in the room the entire time.',
        'Caption underneath: "we do this every week and we will do it again".',
      ];
      const setup = fill(pick(rng, setups), angle);
      const punchline = fill(pick(rng, punchlines), angle);
      return {
        format,
        setup,
        punchline,
        altText: fill('A described image concept about {S} and {S2} in the style of {sub}.', angle),
      };
    },
    body: angle => chance(angle.rng, 0.4) ? sentence(angle.rng, [
      'first attempt at this format, be nice',
      'took about {HRS} minutes, mostly spent on the {G} bit',
      'i know someone has done this already but mine has worse handwriting',
      'open to a version two if people have better punchlines',
    ], angle) : '',
    flairs: ['Meme', 'OC', 'Art', 'Humor'],
    voices: ['joke', 'praise', 'oneliner', 'tangent'],
  },
  {
    id: 'question',
    label: 'Question',
    type: 'text',
    weight: (p) => 0.6 + p.tone.questionRate * 2.2,
    titles: [
      'How do you all actually handle {T}?',
      'Genuine question about {S}',
      'Is {S} supposed to feel like this or am I doing it wrong?',
      'New here — is the {T} thing always like this?',
      'What is the current consensus on {S}?',
      'Does {S} get better after a while, or is this it?',
      'Silly question, but what makes {S} different from {S2}?',
      'Anyone else stuck on the {T} part?',
      'How did you get past the {T2} stage?',
      'Where does everyone stand on {S} these days?',
      'What is the one {T} opinion you cannot defend but hold anyway?',
    ],
    body: angle => compose(angle, [
      [
        'Asking because I have seen about {N} different answers and they all contradict each other.',
        'I have tried the obvious things and I am still stuck somewhere around {S2}.',
        'Genuinely not a bait question, I want to know how people here think about it.',
        'Context: been around {T} for a few months, so treat me as informed but not experienced.',
      ],
      [
        'The part that confuses me is how {S} interacts with {T2}.',
        'Specifically I mean the {P} side of it, not the general version.',
        'Every guide I find assumes you already know the answer.',
      ],
      PERSONAL,
      ASKS,
    ]),
    flairs: ['Question', 'Help', 'Discussion', 'Newbie'],
    voices: ['answer', 'answer', 'counter', 'joke', 'question'],
  },
  {
    id: 'hot-take',
    label: 'Hot take',
    type: 'text',
    weight: (p) => 0.55 + p.tone.humor * 0.7 + (1 - p.tone.formality) * 0.6,
    titles: [
      'Unpopular opinion: {S} is overrated and {S2} is the reason',
      'Hot take — the {T} discourse has gotten out of hand',
      'I do not think {S} is the problem people say it is',
      'We are all being far too nice about {S}',
      'Controversial: {S2} did more for this community than {S} ever has',
      '{S} is fine. It is the way we talk about {T} that is broken',
      'The {P} obsession is making everyone worse at this',
      'Saying it: {T} peaked a while ago and nobody wants to admit it',
      'Downvote me, but {S} deserved better',
    ],
    body: angle => compose(angle, [
      [
        'Before anyone starts: I like {S}. This is not that kind of post.',
        'I have held this for a while and finally decided the downvotes are worth it.',
        'Prefacing this because the last person who said it got buried.',
      ],
      [
        'The argument is simple. Every time {T} comes up, the conversation collapses into {T2} within four replies.',
        'What actually bothers me is that {S} gets used as a shortcut instead of an argument.',
        'We keep rewarding the loudest version of the {T} take and then acting surprised when that is all we get.',
      ],
      [
        'The version of this I would accept is one where someone can explain {S2} without falling back on {P}.',
        'If {S} really is that central, it should survive a bit of pressure.',
      ],
      ASKS,
    ], { paragraphs: true }),
    flairs: ['Discussion', 'Hot take', 'Rant', 'Opinion'],
    voices: ['counter', 'counter', 'agree', 'joke'],
  },
  {
    id: 'showcase',
    label: 'Showcase',
    type: 'image',
    weight: (p) => 0.25 + (p.formatMix.image + p.formatMix.video) * 1.9,
    titles: [
      'Finally finished my {artifact} — {HRS} hours in',
      'First attempt at {S}. Be gentle',
      'Spent the weekend on this {S} {artifact}',
      '{HRS} hours of work, one {G} mistake I only noticed after',
      'Made {S} for a friend who does not even follow this stuff',
      'My take on {S}, after {N} failed versions',
      'Been chipping away at this since the {T} thread last month',
    ],
    concept: angle => ({
      format: pick(angle.rng, ['Photo set', 'Progress shots', 'Close-up detail', 'Before and after', 'Short clip']),
      setup: fill('Described piece: {S}, with the {P} detail front and centre.', angle),
      punchline: fill('Finishing touch: a small {G} reference that only regulars would catch.', angle),
      altText: fill('A described work-in-progress concept inspired by {sub} conversations about {T}.', angle),
    }),
    body: angle => compose(angle, [
      [
        'Materials and process in the comments if anyone wants them.',
        'Took roughly {HRS} hours spread over two weekends.',
        'The hardest part was getting the {T} bit to read clearly at a glance.',
      ],
      [
        'Version one was a disaster. Version {N} is the one I can look at without wincing.',
        'I stole the layout idea from a thread here about {S2}, so thank you to whoever that was.',
        'Still not sure about the proportions but I have stared at it too long to judge.',
      ],
      [
        'Happy to take critique — I would rather hear the honest version.',
        'If people want it, I can write up how I got there.',
      ],
    ]),
    flairs: ['OC', 'Showcase', 'Art', 'Build'],
    voices: ['praise', 'praise', 'question', 'technical', 'joke'],
  },
  {
    id: 'discussion',
    label: 'Discussion',
    type: 'text',
    weight: (p) => 0.8 + p.tone.formality * 0.8,
    titles: [
      'Where do we think {T} goes from here?',
      'Let us actually talk about {S} properly for once',
      '{S} vs {S2}: what is the real difference in practice?',
      'The thing nobody mentions about {T}',
      'What would change your mind about {S}?',
      'Serious discussion: how much does {T} actually matter?',
      'Is the {T} conversation healthier than it was six months ago?',
      'Ranking {T} takes from "reasonable" to "posted at 3am"',
      'Making the case for {S2} in a sub that clearly prefers {S}',
    ],
    body: angle => compose(angle, [
      OPENERS,
      [
        'Three positions seem to exist here. One: {S} is central and everything else follows. Two: it is a distraction from {T2}. Three: it does not matter as long as people enjoy it.',
        'I want to separate two arguments that keep getting fused: whether {S} is interesting, and whether {S} is important. Those are not the same claim.',
        'My honest position is somewhere in the middle, which is why I keep failing to argue it convincingly.',
      ],
      EVIDENCE,
      ASKS,
    ], { paragraphs: true }),
    flairs: ['Discussion', 'Meta', 'Analysis'],
    voices: ['agree', 'counter', 'answer', 'tangent', 'joke'],
  },
  {
    id: 'poll',
    label: 'Poll',
    type: 'poll',
    weight: (p) => 0.18 + p.formatMix.poll * 4,
    titles: [
      'Settling this: {E} or {E2}?',
      'Poll — how do you actually feel about {T}?',
      'Quick poll before the next {T} argument starts',
      'Where do you land on {S}?',
    ],
    poll: angle => {
      const { rng } = angle;
      const options = [
        fill('{E}, obviously', angle),
        fill('{E2}, and it is not close', angle),
        fill('Depends entirely on {T2}', angle),
        'I am only here for the comments',
      ];
      return options.map(label => ({ label, votes: intBetween(rng, 40, 2400) }));
    },
    body: angle => sentence(angle.rng, [
      'No wrong answers, but there is definitely a wrong answer.',
      'Results in a week. I will be insufferable about whichever side wins.',
      'Explain yourself in the comments, especially if you pick the third option.',
    ], angle),
    flairs: ['Poll', 'Discussion', 'Community'],
    voices: ['joke', 'agree', 'counter', 'oneliner'],
  },
  {
    id: 'help',
    label: 'Help',
    type: 'text',
    weight: (p) => 0.35 + p.tone.questionRate * 1.4 + p.tone.formality * 0.5,
    titles: [
      'Stuck on {S} and running out of ideas',
      'Tried everything with {T}, what am I missing?',
      '[Help] {S} keeps going wrong at the same point',
      'Beginner question about {S} — sorry if this is obvious',
      'Is there a better approach to {T} than brute force?',
      'Second attempt at {S} went worse than the first',
    ],
    body: angle => compose(angle, [
      [
        'Here is where I am: {S} works fine until {T2} enters the picture, and then it falls apart every time.',
        'I have followed the usual advice — checked {P}, redid the {artifact}, asked two people who know more than me.',
        'This is attempt number {N} and each one fails slightly differently, which feels like a clue.',
      ],
      [
        'Things I have ruled out: the obvious {G} explanation, and the one everyone suggests first.',
        'Happy to provide more detail, I just did not want to write a novel.',
      ],
      ['Any pointers appreciated. I will update the post if I work it out.', 'Will edit with the fix so the next person searching finds it.'],
    ]),
    flairs: ['Help', 'Question', 'Troubleshooting'],
    voices: ['answer', 'answer', 'technical', 'question'],
  },
  {
    id: 'meta',
    label: 'Meta',
    type: 'text',
    weight: (_p, a) => 0.2 + Math.min(0.8, a.batch * 0.09),
    titles: [
      'Can we get a containment thread for {T}?',
      'This sub has gotten noticeably better at talking about {T}',
      'Friendly reminder that {S} posts are allowed to be short',
      'Are we {T}-posting too much or is that just the sub now?',
      'Appreciation post for whoever keeps answering the {T} questions',
      'Proposal: a weekly {T} thread so the front page can breathe',
      'The {P} tag is doing a lot of work lately',
    ],
    body: angle => compose(angle, [
      [
        'Not a complaint, more an observation from someone who reads more than they post.',
        'Bringing this up because the sub has roughly doubled in the time I have been here.',
        'This is the friendliest possible version of this post, I promise.',
      ],
      [
        'Over the last few weeks the front page has been mostly {T}, which is fun until it is the only thing here.',
        'The good version of this community is the one where a {T} joke and a serious {T2} question can sit next to each other.',
        'I do not think anything is broken. I think we could just be a bit more deliberate.',
      ],
      ['Mods, feel free to remove if this is unhelpful.', 'Open to being told I am wrong about this.'],
    ], { paragraphs: true }),
    flairs: ['Meta', 'Discussion', 'Community'],
    voices: ['agree', 'counter', 'mod', 'joke'],
  },
  {
    id: 'appreciation',
    label: 'Appreciation',
    type: 'text',
    weight: (p) => 0.3 + (1 - p.tone.profanity) * 0.4,
    titles: [
      'Quiet appreciation post for {S}',
      '{S} does not get talked about enough and I want to fix that',
      'Coming back to {T} after a long break and it still holds up',
      'The small thing about {S} that I never see mentioned',
      'Underrated: the way {S2} sets up {S}',
    ],
    body: angle => compose(angle, [
      [
        'No argument here, no take. Just wanted to put this somewhere people would understand.',
        'Had one of those moments this week where something clicked that had been sitting there the whole time.',
        'Everyone talks about the big {T} moments and skips the quiet ones.',
      ],
      [
        'What gets me is the restraint. {S} could easily have been overdone and it never is.',
        'It is the kind of detail you only notice on a second pass, and then you cannot stop noticing it.',
        'It works because nobody draws attention to it.',
      ],
      ['Anyway. That is it. Carry on.', 'What is the equivalent moment for you?'],
    ]),
    flairs: ['Appreciation', 'Discussion', 'Wholesome'],
    voices: ['agree', 'praise', 'tangent', 'oneliner'],
  },
  {
    id: 'rant',
    label: 'Mild rant',
    type: 'text',
    weight: (p) => 0.25 + p.tone.profanity * 1.6 + p.tone.humor * 0.5,
    titles: [
      'Minor rant: the {T} advice everyone repeats does not work',
      'I am so tired of the {P} conversation',
      'Why does every {T} thread turn into a {T2} argument?',
      'The {T} advice in this sub has gotten lazy',
      'Small thing that has been annoying me about {S} for months',
    ],
    body: angle => compose(angle, [
      [
        'Low stakes complaint, feel free to scroll past.',
        'I need to get this out of my system and you people are the only ones who would understand.',
        'Apologies in advance, this is more venting than analysis.',
      ],
      [
        'Every single time, someone shows up with the {P} answer as if it settles anything.',
        'It is not that the advice is wrong. It is that it is the answer to a different question than the one being asked.',
        'And then the thread dies, and next week the same question appears, and we all do it again.',
      ],
      ['Right. Done. Back to normal.', 'If I am the problem here, tell me and I will accept it.'],
    ]),
    flairs: ['Rant', 'Discussion', 'Meta'],
    voices: ['agree', 'counter', 'joke', 'oneliner'],
  },
  {
    id: 'what-if',
    label: 'Hypothetical',
    type: 'text',
    weight: (p, a) => 0.35 + (a.blend ? 0.9 : 0) + p.tone.humor * 0.5,
    titles: [
      'What would {E} actually do in a {T2} situation?',
      'Hypothetical: {E} and {E2} swap places for a week',
      'If {S} had never happened, where would {T2} be now?',
      'Serious question with a silly premise: {E} vs {E2}, who wins?',
      'Alternate version where {S} goes the other way',
      'Describe {S} to someone who has never heard of {T} — hard mode',
    ],
    body: angle => compose(angle, [
      [
        'Rules: no cheating, no "it depends", and you have to commit to an answer.',
        'This came out of a conversation that got far too heated for something so pointless.',
        'Purely for fun, but I am curious whether there is a consensus.',
      ],
      [
        'My answer: {S} wins on paper and loses immediately in practice, because {T2} ruins everything.',
        'I keep going back and forth. The obvious answer is {E}, but the obvious answer is usually the boring one.',
        'The interesting part is not who wins, it is what the disagreement says about how people read {T}.',
      ],
      ['Show your reasoning, that is the fun bit.', 'Best answer gets nothing but my respect.'],
    ]),
    flairs: ['Discussion', 'Hypothetical', 'Fun'],
    voices: ['answer', 'joke', 'counter', 'lore'],
  },
  {
    id: 'newcomer',
    label: 'First impressions',
    type: 'text',
    weight: (p) => 0.3 + p.tone.questionRate * 0.8,
    titles: [
      'First week here. Some honest first impressions about {T}',
      'Came for {S}, stayed for the {T2} arguments',
      'Outsider perspective on the {T} thing',
      'Finally got into {S} after years of ignoring it',
      '{NN} days in and {S} is all I think about',
    ],
    body: angle => compose(angle, [
      [
        'I avoided this for ages because the discussion around it looked impenetrable from the outside.',
        'A friend finally wore me down and I have been here every day since.',
        'Posting this mostly so future-me remembers what it felt like before I knew anything.',
      ],
      [
        'The thing nobody warned me about is how much of the experience is the conversation around {T}, not {T} itself.',
        'What surprised me most: {S} is far less intimidating than the discourse makes it sound.',
        'I expected gatekeeping and instead got {N} people explaining {P} to me patiently.',
      ],
      ['What should I look at next?', 'Tell me the thing I am obviously about to get wrong.'],
    ]),
    flairs: ['Discussion', 'New here', 'Question'],
    voices: ['praise', 'answer', 'joke', 'agree'],
  },
  {
    id: 'observation',
    label: 'Observation',
    type: 'text',
    casual: true,
    weight: (p) => 0.4 + (1 - p.tone.formality) * 0.6,
    titles: [
      'small thing i noticed about {S} that i cannot unsee now',
      'the {T} thing is funnier once you notice {P}',
      'been thinking about how {S} and {S2} rhyme',
      'anyone else clock that {S} only ever shows up alongside {T2}?',
      'am i the only one who reads {S} completely differently now?',
    ],
    body: angle => compose(angle, [
      [
        'it is not a theory, it is barely an observation, but it has been living in my head rent free.',
        'no big point to make here. just noticed it and needed to say it out loud.',
        'this is the kind of thing that only makes sense to people who are also too invested.',
      ],
      [
        'once you see it in the {P} context it is everywhere.',
        'i genuinely cannot tell if this is deliberate or if i am doing the conspiracy-board thing again.',
      ],
    ]),
    flairs: ['Discussion', 'Observation', 'Fun'],
    voices: ['agree', 'joke', 'lore', 'oneliner'],
  },
  {
    id: 'recommendation',
    label: 'Recommendations',
    type: 'text',
    weight: (p) => 0.3 + p.tone.questionRate * 0.9,
    titles: [
      'Looking for something with the same energy as {S}',
      'If I liked {S} but bounced off {S2}, what next?',
      'Best {T} recommendations for someone with limited time',
      'Give me your most confident {T} recommendation',
      'What is the {S} of {T2}?',
    ],
    body: angle => compose(angle, [
      [
        'Specifically after the {P} feeling, not just surface-level similarity.',
        'I have already been through the obvious ones, so hit me with the deep cuts.',
        'Constraints: not much time, low tolerance for the {G} stuff.',
      ],
      [
        'What I liked about {S} was how little it explained itself.',
        'The bar is whatever made {T} stick for me, which I still cannot articulate properly.',
      ],
      ['Will report back on whatever I try.', 'One recommendation each, make it count.'],
    ]),
    flairs: ['Request', 'Question', 'Discussion'],
    voices: ['answer', 'answer', 'counter', 'joke'],
  },
  {
    id: 'update',
    label: 'Update',
    type: 'text',
    weight: (_p, a) => 0.2 + Math.min(0.6, a.batch * 0.05),
    titles: [
      'Update on the {T} thing I posted about',
      '[Update] It worked, and not for the reason anyone said',
      'Following up on my {S} question from last week',
      'Solved: the {T} problem was {T2} the whole time',
    ],
    body: angle => compose(angle, [
      [
        'A few people asked me to post what happened, so here it is.',
        'Short version: the advice here was right, but for different reasons than the top comment gave.',
        'Owe this sub a thank you, so this is me paying it back.',
      ],
      [
        'The fix turned out to be embarrassingly simple once I stopped assuming {S} was the cause.',
        'Turns out {S2} had been quietly causing it for weeks and I only spotted it by accident.',
        'Total time wasted: about {HRS} hours. Time the actual fix took: under ten minutes.',
      ],
      ['Leaving this up in case someone searches the same thing at 2am.', 'Happy to answer questions if anyone hits the same wall.'],
    ]),
    flairs: ['Update', 'Solved', 'Discussion'],
    voices: ['praise', 'answer', 'joke', 'agree'],
  },
  {
    id: 'ranking',
    label: 'Ranking',
    type: 'text',
    weight: (p) => 0.28 + p.tone.humor * 0.7,
    titles: [
      'Ranking every {T} take by how much trouble it starts',
      'Tier list: {T} opinions, from defensible to unhinged',
      'My completely objective {S} ranking (prepare to disagree)',
      'The {N} stages of caring about {T}',
    ],
    body: angle => compose(angle, [
      [
        'S tier: {S}, and I will not be taking questions.\nA tier: {S2}, held back only by the people who defend it.\nB tier: everything involving {P}.\nC tier: the {G} discourse, which has never produced a good thread.',
        '1. {S} — the correct answer.\n2. {S2} — the answer people give to seem interesting.\n3. {P} — the answer that starts arguments.\n4. Whatever the top comment says, because it always wins anyway.',
      ],
      [
        'Placements are final unless someone makes a genuinely good argument, which has never happened.',
        'I have already changed my mind about two of these while typing.',
      ],
    ], { paragraphs: true }),
    flairs: ['Discussion', 'Tier list', 'Fun'],
    voices: ['counter', 'counter', 'joke', 'agree'],
  },
  {
    id: 'weekly',
    label: 'Recurring thread',
    type: 'text',
    weight: (p) => (p.recurringThreads.length ? 0.5 : 0.08),
    titles: [
      'Weekly {T} thread — what are you working on?',
      'Daily discussion: {T}',
      'Simple questions thread ({T} edition)',
      'Free talk: {T}, {T2}, and whatever else',
    ],
    body: angle => compose(angle, [
      [
        'Post the small stuff that does not need its own thread. Questions, progress, half-formed thoughts about {T} — all welcome.',
        'The usual: no question is too basic, be decent to first-timers, and keep the {G} arguments in the other thread.',
      ],
      [
        'I will start — I have been stuck on {S} for three days and I refuse to look it up.',
        'Mods will sticky this if it goes well and quietly forget about it if it does not.',
      ],
    ]),
    flairs: ['Weekly', 'Megathread', 'Discussion'],
    voices: ['answer', 'agree', 'joke', 'question'],
  },
  {
    id: 'crossover',
    label: 'Crossover',
    type: 'text',
    weight: (_p, a) => (a.blend ? 1.1 : 0.12),
    titles: [
      '{E} and {E2} in the same conversation is doing something to my brain',
      'The {T} crowd and the {T2} crowd want the same thing and refuse to admit it',
      'Combining the {T} thing with the {T2} thing was a mistake (it was not)',
      'Somebody put {S} next to {S2} and now I cannot separate them',
    ],
    body: angle => compose(angle, [
      [
        'Two threads this week were arguing about completely different things in exactly the same shape.',
        'This started as a joke and then I accidentally convinced myself.',
        'Bear with me, this gets stupid before it gets interesting.',
      ],
      [
        'The {T} argument is about whether {S} deserves the attention. The {T2} argument is about whether {S2} earned it. Same question, different costume.',
        'Put them side by side and the disagreement is basically about taste, which is why neither side ever wins.',
      ],
      ASKS,
    ], { paragraphs: true }),
    flairs: ['Discussion', 'Analysis', 'Fun'],
    voices: ['agree', 'counter', 'lore', 'joke'],
  },
];

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

const COMMENT_BANKS: Record<string, readonly string[]> = {
  agree: [
    'This is the part that gets me too. {S} only holds together if you already accept {T2}, and nobody ever says that part out loud.',
    'Been quietly thinking this for weeks. Glad someone wrote it up properly.',
    'Strong agree, with one caveat: it works better for {S} than it does for {S2}.',
    'The {P} point is the strongest bit here. Everything else is arguable, that one is not.',
    'Yeah. I do not think this is even controversial, it just sounds controversial.',
  ],
  counter: [
    'Respectfully, I think this falls apart around {S2}. The pattern you are describing shows up everywhere once you go looking for it.',
    'Counterpoint: the simplest explanation is that {T} is just popular right now, and popularity produces coincidences.',
    'I want to agree but the {P} thing has a much more boring explanation.',
    'This works right up until you apply it to {S2}, and then it predicts the opposite of what happened.',
    'Half of this is right and the other half is doing a lot of heavy lifting.',
  ],
  answer: [
    'Short answer: yes, and the reason is {T2}. Longer answer: it depends on how much you care about {P}.',
    'What worked for me was ignoring the standard advice and treating {S} as the last step instead of the first.',
    'Do the {G} thing first. It sounds unrelated and it fixes about 70% of these.',
    'You are not doing it wrong, it genuinely is like that at the start. It gets better around the point where {S2} stops being confusing.',
    'Two things: check {P}, then check it again. It is almost always that.',
  ],
  joke: [
    'ah yes, {E}. my beloved.',
    'this post is legally required to appear here every {N} days and I am grateful for it',
    'not {E} slander on my timeline',
    'I was going to make a joke about {S2} but the comment section beat me to it',
    'the {G} to {T} pipeline claims another one',
    'incredible. terrible. I am upvoting.',
  ],
  lore: [
    'Worth adding: {S} has come up in almost every {T} thread since the beginning, usually without anyone noticing the pattern.',
    'There is an older thread that covers some of this. Different conclusion, same starting point.',
    'The detail people forget is that {S2} came first, which changes the order of everything you just described.',
  ],
  question: [
    'Wait, where does {S2} fit into this?',
    'Genuine question — does this still work if you drop the {P} assumption?',
    'How does this interact with {T2}? That is the bit I always get stuck on.',
  ],
  praise: [
    'The {P} detail is what makes this. Really nicely done.',
    'This is excellent. The restraint is what sells it.',
    'Absurd that this took {HRS} hours and looks this clean.',
    'Saving this. Great work.',
  ],
  technical: [
    'If you are doing this again, start from {S2} and work backwards. Saves a lot of the {G} pain.',
    'Minor note: the {P} approach is more forgiving than what most guides recommend.',
    'What did you use for the {T} part? Results look better than mine did.',
  ],
  tangent: [
    'Slightly off topic but this reminds me of the {T2} discussion from a while back.',
    'Unrelated: has anyone else noticed {S2} getting mentioned a lot more lately?',
    'Tangent, sorry — is {P} still considered the default here?',
  ],
  oneliner: [
    'Correct.',
    'this is the one',
    'No notes.',
    'Finally someone said it.',
    'unfortunately true',
    'Take my upvote and leave.',
  ],
  mod: [
    'Leaving this up — it is a fair point and the discussion has been civil so far.',
    'Good timing, we have been talking about exactly this internally.',
  ],
};

const OP_REPLIES = [
  'This is the pushback I wanted. The {S2} point is fair and I do not have a good answer for it yet.',
  'Yeah, you are right that I oversold the {P} part. The narrower version still stands I think.',
  'Adding this to the post, thank you.',
  'Genuinely had not considered {T2} here. Going to sit with that.',
  'Ha, that is a better version of what I was trying to say.',
];

const NAME_A = ['quiet', 'mild', 'lucid', 'crooked', 'patient', 'feral', 'sleepy', 'honest', 'liminal', 'rusty', 'velvet', 'cosmic', 'frosted', 'anxious', 'tidy', 'dusty', 'lofty', 'brisk', 'plush', 'salted'];
const NAME_B = ['otter', 'lantern', 'compass', 'parsnip', 'marble', 'pigeon', 'harbor', 'kettle', 'cassette', 'meadow', 'bramble', 'oyster', 'tangent', 'raccoon', 'fennel', 'monsoon', 'gravel', 'orbit', 'thimble', 'sparrow'];
const NAME_SUFFIX = ['_exe', '_irl', '77', '_the_third', 'x2', '_again', '99', '_returns', '_maybe', ''];

function makeAuthor(rng: Rng, profile: CultureProfile): string {
  const style = rng();
  if (style < 0.3 && profile.slang.length) {
    const term = pick(rng, profile.slang).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (term.length > 2 && term.length < 15) return `${term}_${pick(rng, NAME_B)}`;
  }
  if (style < 0.55 && profile.entities.length) {
    const term = pick(rng, profile.entities).term.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (term.length > 2 && term.length < 15) return `${pick(rng, NAME_A)}_${term}`;
  }
  if (style < 0.75) return `${pick(rng, NAME_A)}_${pick(rng, NAME_B)}${pick(rng, NAME_SUFFIX)}`;
  const capA = pick(rng, NAME_A);
  const capB = pick(rng, NAME_B);
  return `${capA[0].toUpperCase()}${capA.slice(1)}-${capB[0].toUpperCase()}${capB.slice(1)}-${intBetween(rng, 100, 9999)}`;
}

function initials(name: string): string {
  const parts = name.split(/[_\-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function makeComments(angle: Angle, archetype: Archetype, opName: string, total: number): Comment[] {
  const { rng, profile } = angle;
  const voices = shuffled(rng, archetype.voices);
  const count = Math.max(2, Math.min(6, Math.round(Math.log10(total + 10) * 2.4)));
  const comments: Comment[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < count; i++) {
    const voice = voices[i % voices.length];
    const bank = COMMENT_BANKS[voice] || COMMENT_BANKS.agree;
    const author = makeAuthor(rng, profile);
    const score = Math.max(1, Math.round((total / (1.6 + i * 1.5)) * between(rng, 0.25, 0.85)));
    const replies: Comment[] = [];

    if (i === 0 && chance(rng, 0.65)) {
      replies.push({
        id: `c-${i}-op`,
        author: opName,
        avatar: initials(opName),
        body: sentence(rng, OP_REPLIES, angle, seen),
        score: Math.max(1, Math.round(score * between(rng, 0.15, 0.5))),
        time: `${intBetween(rng, 10, 58)}m`,
        isOp: true,
        replies: [],
      });
    } else if (chance(rng, 0.4)) {
      const replyVoice = pick(rng, ['joke', 'counter', 'oneliner', 'agree']);
      const replyAuthor = makeAuthor(rng, profile);
      replies.push({
        id: `c-${i}-r`,
        author: replyAuthor,
        avatar: initials(replyAuthor),
        body: sentence(rng, COMMENT_BANKS[replyVoice], angle, seen),
        score: Math.max(1, Math.round(score * between(rng, 0.1, 0.6))),
        time: `${intBetween(rng, 1, 9)}h`,
        replies: [],
      });
    }

    comments.push({
      id: `c-${i}`,
      author,
      avatar: initials(author),
      body: sentence(rng, bank, angle, seen),
      score,
      time: i === 0 ? `${intBetween(rng, 20, 59)}m` : `${intBetween(rng, 1, 14)}h`,
      isMod: voice === 'mod',
      replies,
    });
  }
  return comments;
}

/* ------------------------------------------------------------------ */
/* Post assembly                                                       */
/* ------------------------------------------------------------------ */

function relativeTime(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / (60 * 24));
  return days < 7 ? `${days}d` : `${Math.round(days / 7)}w`;
}

function applyTone(title: string, archetype: Archetype, profile: CultureProfile, rng: Rng): string {
  let result = title;
  const shouldLowercase = archetype.casual || profile.tone.lowercase > 0.42;
  if (shouldLowercase && chance(rng, Math.max(0.35, profile.tone.lowercase))) {
    result = result.charAt(0).toLowerCase() + result.slice(1);
  } else {
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (archetype.casual) result = result.replace(/\bi\b/g, 'I');
  }
  if (profile.tone.spoilerRate > 0.22 && chance(rng, Math.min(0.22, profile.tone.spoilerRate * 0.45))) {
    result = `[Spoilers] ${result}`;
  }
  if (profile.tone.exclamation > 0.3 && chance(rng, 0.2) && !result.endsWith('?')) {
    result = result.replace(/\.?$/, '!');
  }
  return result;
}

/** Prefer a real community flair, but only one that suits the kind of post we wrote. */
function chooseFlair(rng: Rng, profile: CultureProfile, archetype: Archetype): string {
  const wanted = archetype.flairs.map(flair => flair.toLowerCase());
  const available = profile.flairs.map(flair => flair.text).filter(Boolean);
  const matching = available.filter(flair => {
    const value = flair.toLowerCase();
    return wanted.some(want => value.includes(want) || want.includes(value));
  });
  if (matching.length && chance(rng, 0.85)) return pick(rng, matching);
  if (available.length && chance(rng, 0.12)) return pick(rng, available);
  return pick(rng, archetype.flairs);
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

export interface SynthesisContext {
  profile: CultureProfile;
  community: CommunityProfile;
  batch: number;
  count: number;
  seedOffset?: number;
  usedTitles: Set<string>;
  usedSignatures: Set<string>;
}

export function synthesizePosts(context: SynthesisContext): Post[] {
  const { profile, community, batch, count, usedTitles, usedSignatures } = context;
  const posts: Post[] = [];
  const baseSeed = hashString(`${profile.subreddit}:${profile.fetchedAt}:${batch}:${context.seedOffset || 0}`);

  let attempts = 0;
  let index = 0;
  while (posts.length < count && attempts < count * 14) {
    attempts += 1;
    const rng = mulberry32(baseSeed + attempts * 7919 + index * 104729);
    const angle = buildAngle(profile, rng, batch);

    const archetype = weightedPick(rng, ARCHETYPES, item => {
      let weight = item.weight(profile, angle);
      if (item.type === 'image' && profile.formatMix.image + profile.formatMix.video < 0.12) weight *= 0.3;
      if (item.type === 'poll' && profile.formatMix.poll < 0.01) weight *= 0.35;
      // Discourage repeating the same archetype back to back within a batch.
      if (posts.length && posts[posts.length - 1].archetype === item.id) weight *= 0.12;
      if (posts.filter(post => post.archetype === item.id).length >= 2) weight *= 0.25;
      return weight;
    });

    const signature = `${archetype.id}|${angle.topic.id}|${angle.subject.toLowerCase()}`;
    if (usedSignatures.has(signature)) continue;

    const unusedPatterns = archetype.titles.filter(pattern => !usedSignatures.has(`pattern|${pattern}`));
    const pattern = pick(rng, unusedPatterns.length ? unusedPatterns : archetype.titles);
    const rawTitle = fill(pattern, angle);
    const title = applyTone(rawTitle, archetype, profile, rng);
    const key = normalizeTitle(title);
    if (!key || usedTitles.has(key)) continue;

    usedSignatures.add(signature);
    usedSignatures.add(`pattern|${pattern}`);
    usedTitles.add(key);
    index += 1;

    const ageMinutes = Math.round(
      between(rng, 8, 200) + batch * between(rng, 140, 320) + (archetype.id === 'weekly' ? 600 : 0),
    );
    const heatFactor = 0.35 + angle.topic.heat * 0.9 + (angle.topic.momentum === 'rising' ? 0.35 : 0);
    const score = Math.max(
      3,
      Math.round(Math.pow(between(rng, 1.4, 9.5), 2.35) * heatFactor * (1 + Math.log10(Math.max(10, profile.subscribers || 20000)) / 5)),
    );
    const commentCount = Math.max(1, Math.round(score * between(rng, 0.04, 0.4)));
    const author = makeAuthor(rng, profile);

    const flair = chooseFlair(rng, profile, archetype);

    const body = archetype.body ? archetype.body(angle) : '';
    const concept = archetype.concept ? archetype.concept(angle) : undefined;

    const post: Post = {
      id: `sim-${community.id}-${batch}-${index}-${hashString(key).toString(36)}`,
      communityId: community.id,
      author,
      avatar: initials(author),
      title,
      body: body || undefined,
      flair,
      flairColor: community.color,
      score,
      comments: commentCount,
      time: relativeTime(ageMinutes),
      ageMinutes,
      type: archetype.type,
      concept,
      imageAlt: concept?.altText,
      readTime: body.length > 520 ? `${Math.max(2, Math.round(body.length / 900))} min read` : undefined,
      trend: ageMinutes < 240 && score > 600 ? 'rising' : score > 2600 ? 'hot' : undefined,
      pollOptions: archetype.poll ? archetype.poll(angle) : undefined,
      commentTree: makeComments(angle, archetype, author, commentCount),
      generated: true,
      generator: 'engine',
      archetype: archetype.label,
      topicLabel: angle.blend ? `${angle.topic.label} × ${angle.blend.label}` : angle.topic.label,
      contextSource: profile.source,
      batch,
    };

    posts.push(post);
  }

  return posts;
}

export const archetypeNames = ARCHETYPES.map(item => item.label);
