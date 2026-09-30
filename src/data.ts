import type { CommunityProfile, Post } from './types';

export const communities: CommunityProfile[] = [
  {
    id: 'programming', sourceSubreddit: 'programming', dynamic: false, name: 'r/programming', displayName: 'Programming', icon: '⌘', color: '#5b5bd6', colorSoft: '#eeedff', category: 'Programming',
    description: 'For people who care about the craft, not just the framework. Architecture, debugging stories, code review, and the human side of shipping software.',
    members: 842000, online: 3214, created: 'March 2018', subscribed: true,
    rules: ['Show your work when asking for help', 'No framework wars without substance', 'Sanitize code and logs', 'Career questions go in the Friday thread'],
    tone: 'Technically precise, candid, dryly funny, allergic to hype', vocabulary: ['yak shave', 'footgun', 'DX', 'blast radius', 'hot path'],
    typicalUsers: 'Working engineers, patient senior developers, maintainers, and curious juniors',
    commonTopics: ['debugging postmortems', 'language design', 'code review', 'architecture tradeoffs', 'developer tooling'],
    preferredFormats: ['minimal reproduction', 'postmortem', 'showcase with source', 'opinion with context'], typicalLength: '250–900 words',
    commentStyle: 'Concrete counterexamples, small code snippets, and stories from production',
    commonOpinions: ['boring technology is often good', 'benchmarks need context', 'readability beats cleverness'],
    recurringThemes: ['Friday code review', 'What broke in prod?', 'Tiny tools Tuesday'],
    contentToAvoid: ['homework dumps', 'AI-generated tutorials without verification', 'recruiting spam'], moderationStyle: 'Strict on low-effort posts; patient with well-framed beginner questions'
  },
  {
    id: 'astrophotography', sourceSubreddit: 'astrophotography', dynamic: false, name: 'r/astrophotography', displayName: 'Astrophotography', icon: '✦', color: '#5468ff', colorSoft: '#edf0ff', category: 'Photography',
    description: 'Astrophotography, long exposures, and the quiet hours between last light and dawn. Technical details are part of the picture.',
    members: 319000, online: 1487, created: 'August 2020', subscribed: true,
    rules: ['Include camera, lens, settings, and processing notes', 'Composites must be labeled', 'No AI-generated images', 'Critique the photo, not the photographer'],
    tone: 'Patient, observant, gear-aware but image-first', vocabulary: ['stacked', 'tracked', 'Bortle', 'foreground blend', 'coma'],
    typicalUsers: 'Night hikers, landscape photographers, telescope owners, and sleep-deprived beginners',
    commonTopics: ['Milky Way seasons', 'light pollution', 'stacking workflows', 'moonlit landscapes'], preferredFormats: ['image with EXIF', 'field report', 'constructive critique'], typicalLength: 'Brief caption plus detailed settings',
    commentStyle: 'Specific technical critique mixed with genuine awe', commonOpinions: ['planning beats expensive gear', 'over-processing kills subtle skies'], recurringThemes: ['New moon field thread', 'Before/after processing'], contentToAvoid: ['unlabeled composites', 'gear affiliate links', 'AI imagery'], moderationStyle: 'Metadata enforced; edits and composites clearly labeled'
  },
  {
    id: 'mechanicalkeyboards', sourceSubreddit: 'MechanicalKeyboards', dynamic: false, name: 'r/MechanicalKeyboards', displayName: 'Mechanical Keyboards', icon: 'K', color: '#208c74', colorSoft: '#e8f8f3', category: 'Hobbies',
    description: 'Mechanical keyboards without the gatekeeping. Builds, sound tests, switches, keycap design, and sensible advice for your first board.',
    members: 476000, online: 2270, created: 'June 2019', subscribed: true,
    rules: ['Build photos require a parts list', 'Vendor posts use the Vendor flair', 'No counterfeit checks outside the megathread', 'Be kind to membrane refugees'],
    tone: 'Enthusiastic, detail-obsessed, playful', vocabulary: ['thock', 'clack', 'tape mod', 'FR4', 'south-facing', 'endgame'],
    typicalUsers: 'Keyboard builders, designers, office workers, and people pretending this is their final board', commonTopics: ['switch feel', 'layout choices', 'keycap colorways', 'desk setups'], preferredFormats: ['build showcase', 'sound test', 'switch review', 'buying advice'], typicalLength: 'Photo-forward with concise specs', commentStyle: 'Parts questions, aesthetic praise, and good-natured endgame jokes', commonOpinions: ['sound is mostly case and plate', 'there is no endgame'], recurringThemes: ['Budget Build Sunday', 'Switch swap'], contentToAvoid: ['unmarked ads', 'price shaming'], moderationStyle: 'Relaxed, with aggressive vendor disclosure rules'
  },
  {
    id: 'patientgamers', sourceSubreddit: 'patientgamers', dynamic: false, name: 'r/patientgamers', displayName: 'Patient Gamers', icon: '◈', color: '#a15cce', colorSoft: '#f6ebfc', category: 'Gaming',
    description: 'Great games do not expire. Thoughtful conversations about games after the launch noise, patches, and price tags have settled.',
    members: 1200000, online: 5012, created: 'November 2016', subscribed: true,
    rules: ['No release-window hype', 'Mark all spoilers', 'Explain what worked for you', 'No platform wars'], tone: 'Reflective, spoiler-conscious, anti-hype', vocabulary: ['backlog', 'clicked', 'holds up', 'QoL', 'patient price'], typicalUsers: 'Adults with backlogs, lapsed players, and people discovering classics', commonTopics: ['games that aged well', 'late reviews', 'backlog habits', 'difficulty and accessibility'], preferredFormats: ['finished-it review', 'did not finish reflection', 'recommendation request'], typicalLength: '500–1,500 words', commentStyle: 'Personal recommendations with careful spoiler tags', commonOpinions: ['you can stop a game you do not enjoy', 'launch discourse distorts perception'], recurringThemes: ['What are you playing?', '12 months later'], contentToAvoid: ['day-one news', 'unmarked spoilers'], moderationStyle: 'Gentle but firm about spoilers and effort'
  },
  {
    id: 'personalfinance', sourceSubreddit: 'personalfinance', dynamic: false, name: 'r/personalfinance', displayName: 'Personal Finance', icon: '↗', color: '#1b8a5a', colorSoft: '#e5f7ed', category: 'Personal finance',
    description: 'Calm, judgment-free personal finance for regular lives. Build a plan you can actually keep.', members: 678000, online: 2871, created: 'January 2017', subscribed: true,
    rules: ['No crypto promotion', 'Include country and rough numbers', 'No shame, ever', 'Protect personal information'], tone: 'Practical, calm, skeptical of shortcuts', vocabulary: ['sinking fund', 'match', 'runway', 'expense ratio', 'automate'], typicalUsers: 'Budget beginners, debt payers, steady index investors, and helpful spreadsheet people', commonTopics: ['emergency funds', 'debt payoff', 'first salary', 'retirement accounts'], preferredFormats: ['budget review', 'milestone', 'decision help', 'weekly wins'], typicalLength: 'Numbers first, 200–700 words', commentStyle: 'Actionable math, gentle reality checks, country-specific caveats', commonOpinions: ['behavior matters more than optimization', 'emergency funds buy options'], recurringThemes: ['Monday money check-in', 'Small wins'], contentToAvoid: ['pump-and-dumps', 'unqualified tax certainty'], moderationStyle: 'Heavy scam filtering; misinformation gets sourced corrections'
  },
  {
    id: 'cooking', sourceSubreddit: 'Cooking', dynamic: false, name: 'r/Cooking', displayName: 'Cooking', icon: '⌁', color: '#d26a31', colorSoft: '#fff0e6', category: 'Food',
    description: 'The food you actually cook. Weeknight saves, ambitious weekends, imperfect loaves, and recipes worth repeating.', members: 935000, online: 4190, created: 'May 2015', subscribed: true,
    rules: ['Recipe or method in comments', 'Credit adapted recipes', 'No food-shaming', 'Safety advice must cite a reliable source'], tone: 'Warm, practical, sensory, lightly chaotic', vocabulary: ['fond', 'mise', 'hydration', 'jammy', 'weeknight'], typicalUsers: 'Home cooks, tired parents, recipe tinkerers, and enthusiastic beginners', commonTopics: ['pantry meals', 'bread troubleshooting', 'sauces', 'regional comfort food'], preferredFormats: ['finished dish', 'recipe rescue', 'technique discussion'], typicalLength: 'Method plus substitutions', commentStyle: 'Substitution ideas, technique diagnosis, and stories about grandmothers', commonOpinions: ['recipes are maps, not laws', 'salt as you go'], recurringThemes: ['Fridge-cleanout Friday', 'Sunday project'], contentToAvoid: ['unsafe canning advice', 'stolen recipe content'], moderationStyle: 'Friendly; strict only about credit and food safety'
  },
  {
    id: 'travel', sourceSubreddit: 'travel', dynamic: false, name: 'r/travel', displayName: 'Travel', icon: '⌖', color: '#157f9a', colorSoft: '#e6f5f8', category: 'Travel',
    description: 'Travel slower, notice more. Real itineraries, transit details, honest budgets, and the places between the landmarks.', members: 521000, online: 1930, created: 'April 2019', subscribed: false,
    rules: ['No hidden advertising', 'Include season and budget', 'Respect local communities', 'Do not geotag fragile places'], tone: 'Curious, grounded, logistics-savvy', vocabulary: ['shoulder season', 'one-bag', 'regional rail', 'tourist tax'], typicalUsers: 'Solo travelers, rail nerds, weekend explorers, and long-form trip reporters', commonTopics: ['rail routes', 'walkable cities', 'off-season trips', 'packing systems'], preferredFormats: ['trip report', 'itinerary critique', 'photo essay', 'logistics question'], typicalLength: 'Detailed, scannable field notes', commentStyle: 'Current logistics, gentle itinerary pruning, local corrections', commonOpinions: ['fewer stops make better trips', 'the early train is usually worth it'], recurringThemes: ['48 hours in…', 'One-bag audit'], contentToAvoid: ['overtourism bait', 'visa advice stated as universal'], moderationStyle: 'Sources current advice; removes covert promotions'
  },
  {
    id: 'relationship_advice', sourceSubreddit: 'relationship_advice', dynamic: false, name: 'r/relationship_advice', displayName: 'Relationship Advice', icon: '◇', color: '#e14f6d', colorSoft: '#fdebf0', category: 'Relationships',
    description: 'The complicated space between “just talk” and “just leave.” Nuanced relationship advice for people willing to listen.', members: 774000, online: 6108, created: 'September 2018', subscribed: true,
    rules: ['No diagnosis from a paragraph', 'No gender-war generalizations', 'OP safety comes first', 'Assume a person is more than their worst day'], tone: 'Empathetic, direct, nuance-seeking', vocabulary: ['repair attempt', 'mental load', 'boundary', 'pattern', 'bid for connection'], typicalUsers: 'Partners, friends, family members, and a few thoughtful counselors', commonTopics: ['communication loops', 'household labor', 'friendship drift', 'boundaries'], preferredFormats: ['advice request with context', 'update', 'perspective check'], typicalLength: 'Detailed narrative, usually 500–1,200 words', commentStyle: 'Questions before verdicts; scripts for difficult conversations', commonOpinions: ['intent and impact can both matter', 'resentment is data'], recurringThemes: ['Update Monday', 'Was this a repair attempt?'], contentToAvoid: ['armchair diagnosis', 'revenge advice', 'harassment'], moderationStyle: 'Active and trauma-aware; removes pile-ons quickly'
  },
  {
    id: 'cozyplaces', sourceSubreddit: 'CozyPlaces', dynamic: false, name: 'r/CozyPlaces', displayName: 'Cozy Places', icon: '☂', color: '#51718f', colorSoft: '#eaf0f5', category: 'Lifestyle',
    description: 'Soft weather, quiet rooms, and no pressure to be productive. A small shelter from the noisy internet.', members: 288000, online: 976, created: 'October 2021', subscribed: false,
    rules: ['Keep it gentle', 'Original photos are encouraged', 'No hustle-culture lectures', 'Credit art and writing'], tone: 'Cozy, understated, sincere', vocabulary: ['petrichor', 'lamp weather', 'window seat', 'slow morning'], typicalUsers: 'Readers, tea drinkers, ambient music fans, and tired people', commonTopics: ['rain rituals', 'reading corners', 'ambient playlists', 'small comforts'], preferredFormats: ['cozy photo', 'tiny observation', 'playlist', 'gentle check-in'], typicalLength: 'One paragraph or less', commentStyle: 'Short, personal, warm; occasional book and tea recommendation', commonOpinions: ['rest does not need to be earned'], recurringThemes: ['What are you reading?', 'Sunday window'], contentToAvoid: ['forced positivity', 'self-promotion'], moderationStyle: 'Quietly curated and aggressively kind'
  },
  {
    id: 'diy', sourceSubreddit: 'DIY', dynamic: false, name: 'r/DIY', displayName: 'DIY', icon: '⌂', color: '#b67842', colorSoft: '#f8efe7', category: 'DIY',
    description: 'Clever homes under 1,000 square feet. Repairs, renter-friendly builds, storage, and honest before-and-afters.', members: 403000, online: 1432, created: 'February 2020', subscribed: false,
    rules: ['Before/after posts need process details', 'Flag landlord and code constraints', 'No dangerous electrical shortcuts', 'Affiliate links are not allowed'], tone: 'Resourceful, encouraging, safety-conscious', vocabulary: ['renter-safe', 'french cleat', 'dead space', 'stud finder'], typicalUsers: 'Apartment dwellers, first-time DIYers, renters, and practical carpenters', commonTopics: ['vertical storage', 'awkward corners', 'lighting', 'repair over replacement'], preferredFormats: ['before/after', 'build log', 'layout critique'], typicalLength: 'Photos with dimensions and cost', commentStyle: 'Measurement questions, code warnings, clever alternatives', commonOpinions: ['mock it up with tape first'], recurringThemes: ['$100 fix', 'Rental rescue'], contentToAvoid: ['unsafe wiring', 'undisclosed sponsored items'], moderationStyle: 'Safety-first with constructive alternatives'
  },
  {
    id: 'movies', sourceSubreddit: 'movies', dynamic: false, name: 'r/movies', displayName: 'Movies', icon: '▻', color: '#b63f52', colorSoft: '#f9e9ec', category: 'Movies & TV',
    description: 'Close reads, loose reactions, and the shots you cannot stop thinking about. Spoilers are marked and taste is not a contest.', members: 1100000, online: 5733, created: 'July 2014', subscribed: false,
    rules: ['Spoilers in titles are removed', 'Critique ideas, not taste', 'No box-office tribalism', 'Credit video essays'], tone: 'Film-literate without being stuffy', vocabulary: ['blocking', 'diegetic', 'third act', 'needle drop', 'aspect ratio'], typicalUsers: 'Casual moviegoers, cinematography nerds, critics, and Sunday rewatchers', commonTopics: ['visual storytelling', 'adaptations', 'performances', 'underrated scenes'], preferredFormats: ['scene discussion', 'review', 'recommendation chain'], typicalLength: 'A focused argument, 300–900 words', commentStyle: 'Scene citations, alternate readings, respectful disagreement', commonOpinions: ['a plot hole is not always a flaw'], recurringThemes: ['Frame of the week', 'Double-feature pairing'], contentToAvoid: ['culture-war bait', 'piracy links'], moderationStyle: 'Spoiler-strict and fast on personal attacks'
  },
  {
    id: 'fitness', sourceSubreddit: 'Fitness', dynamic: false, name: 'r/Fitness', displayName: 'Fitness', icon: '↟', color: '#ef6b3d', colorSoft: '#fff0e9', category: 'Fitness',
    description: 'Training without mythology. Sustainable strength, useful conditioning, and advice that survives contact with real life.', members: 654000, online: 2744, created: 'December 2017', subscribed: false,
    rules: ['No body shaming', 'Medical claims need evidence', 'Form checks require video context', 'No supplement spam'], tone: 'Evidence-led, encouraging, blunt about gimmicks', vocabulary: ['RPE', 'deload', 'volume', 'adherence', 'progressive overload'], typicalUsers: 'Lifters, runners who lift, busy parents, and coaches', commonTopics: ['programming', 'plateaus', 'recovery', 'returning after breaks'], preferredFormats: ['training log', 'form check', 'evidence discussion', 'milestone'], typicalLength: 'Program details and relevant context', commentStyle: 'Clarifying questions, practical regressions, citations when needed', commonOpinions: ['consistency beats optimality', 'sleep is part of training'], recurringThemes: ['Form Friday', 'Small PRs'], contentToAvoid: ['PED sourcing', 'eating-disorder encouragement'], moderationStyle: 'Claims are moderated more heavily than anecdotes'
  },
  {
    id: 'cscareerquestions', sourceSubreddit: 'cscareerquestions', dynamic: false, name: 'r/cscareerquestions', displayName: 'CS Career Questions', icon: '☕', color: '#8d6448', colorSoft: '#f4ece7', category: 'Career',
    description: 'The honest work conversation: careers, managers, burnout, changing paths, and surviving calendar Tetris.', members: 711000, online: 3208, created: 'January 2019', subscribed: true,
    rules: ['No employer doxxing', 'Recruiters must identify themselves', 'No grindset preaching', 'Salary context needs location'], tone: 'Candid, supportive, professionally skeptical', vocabulary: ['scope', 'skip-level', 'IC track', 'PIP', 'runway'], typicalUsers: 'Office workers, managers, career switchers, and recovering overachievers', commonTopics: ['promotion gaps', 'bad meetings', 'negotiation', 'career changes'], preferredFormats: ['situation/advice', 'workplace win', 'manager perspective'], typicalLength: 'Context-rich but anonymized', commentStyle: 'Scripts, likely interpretations, and pragmatic next steps', commonOpinions: ['document important conversations', 'your job is not your family'], recurringThemes: ['Monday dread thread', 'Tiny work wins'], contentToAvoid: ['retaliation fantasies', 'identifying details'], moderationStyle: 'Privacy-conscious; practical over dramatic'
  },
  {
    id: 'askhistorians', sourceSubreddit: 'AskHistorians', dynamic: false, name: 'r/AskHistorians', displayName: 'Ask Historians', icon: '⌛', color: '#986f2f', colorSoft: '#f5efe2', category: 'History',
    description: 'Primary sources, strange footnotes, and patient context. History is an argument with receipts.', members: 832000, online: 2455, created: 'April 2013', subscribed: false,
    rules: ['Cite substantial claims', 'No presentism as a substitute for analysis', 'Questions must be answerable', 'No denialism'], tone: 'Curious, sourced, context-heavy', vocabulary: ['primary source', 'historiography', 'material culture', 'anachronism'], typicalUsers: 'Historians, archivists, students, and dedicated amateurs', commonTopics: ['daily life', 'historical myths', 'trade routes', 'technology adoption'], preferredFormats: ['answered question', 'source spotlight', 'myth correction'], typicalLength: 'Long-form with references', commentStyle: 'Footnotes, scope caveats, and specialists adding nuance', commonOpinions: ['periodization is useful but artificial'], recurringThemes: ['Archive find Friday', 'Myth under the microscope'], contentToAvoid: ['denialism', 'unsourced quote cards'], moderationStyle: 'High sourcing bar, especially for contested history'
  },
  {
    id: 'cars', sourceSubreddit: 'cars', dynamic: false, name: 'r/cars', displayName: 'Cars', icon: '◒', color: '#3e6678', colorSoft: '#e9f0f3', category: 'Cars',
    description: 'Cars as machines, not status symbols. Maintenance, road trips, old wagons, new EVs, and repairs that taught you something.', members: 590000, online: 2159, created: 'June 2016', subscribed: false,
    rules: ['No street-racing content', 'State year, make, model, and engine', 'Safety-critical advice must be sourced', 'No brand-bashing'], tone: 'Hands-on, specific, wry', vocabulary: ['service history', 'cold start', 'torque spec', 'parasitic draw'], typicalUsers: 'DIY mechanics, commuters, restorers, and practical enthusiasts', commonTopics: ['diagnostics', 'maintenance costs', 'road-trip cars', 'tool recommendations'], preferredFormats: ['repair log', 'buying advice', 'ownership review'], typicalLength: 'Symptoms, tests, fix, result', commentStyle: 'Diagnostic trees and model-specific gotchas', commonOpinions: ['tires matter more than mods'], recurringThemes: ['What was that noise?', 'High-mileage check-in'], contentToAvoid: ['dangerous driving', 'emissions defeat advice'], moderationStyle: 'Safety-first, brand-neutral'
  },
  {
    id: 'decidingtobebetter', sourceSubreddit: 'DecidingToBeBetter', dynamic: false, name: 'r/DecidingToBeBetter', displayName: 'Deciding To Be Better', icon: '✓', color: '#d45f83', colorSoft: '#fbeaf0', category: 'Lifestyle',
    description: 'Did the laundry? Sent the email? Walked around the block? It counts. A place for progress too small for a headline.', members: 367000, online: 1811, created: 'January 2022', subscribed: false,
    rules: ['Celebrate, do not compare', 'No unsolicited advice', 'No ironic posts', 'Protect your privacy'], tone: 'Sincere, concise, low-pressure', vocabulary: ['counts', 'one thing', 'showed up', 'small is real'], typicalUsers: 'People rebuilding routines, students, caregivers, and quiet cheerleaders', commonTopics: ['chores', 'hard conversations', 'self-care', 'starting again'], preferredFormats: ['one-sentence win', 'before/after feeling', 'weekly check-in'], typicalLength: 'One sentence to a short paragraph', commentStyle: 'Brief celebration and relatable solidarity', commonOpinions: ['momentum can start very small'], recurringThemes: ['Three things Friday', 'Monday reset'], contentToAvoid: ['mockery', 'competitive one-upping'], moderationStyle: 'Warm and immediate; unsolicited fixing is removed'
  },
  {
    id: 'science', sourceSubreddit: 'science', dynamic: false, name: 'r/science', displayName: 'Science', icon: '∿', color: '#087f8c', colorSoft: '#e4f5f6', category: 'Science',
    description: 'Interesting research, careful claims. Papers, methods, replication, and what a result does — and does not — tell us.', members: 983000, online: 3890, created: 'February 2015', subscribed: true,
    rules: ['Link the paper, not only the press release', 'No medical advice', 'Separate speculation from results', 'Declare relevant expertise'], tone: 'Curious, methodical, cautious with conclusions', vocabulary: ['effect size', 'preprint', 'confound', 'replication', 'power'], typicalUsers: 'Researchers, science communicators, clinicians, and curious readers', commonTopics: ['new papers', 'research methods', 'replication', 'science communication'], preferredFormats: ['paper discussion', 'method explainer', 'ask a researcher'], typicalLength: 'Abstract summary plus limitations', commentStyle: 'Methods scrutiny, domain caveats, plain-language explanations', commonOpinions: ['statistical significance is not importance'], recurringThemes: ['Paper club', 'Methods Monday'], contentToAvoid: ['medical prescriptions', 'headline-only claims'], moderationStyle: 'Sources checked; expert flair verified'
  },
  {
    id: 'wearethemusicmakers', sourceSubreddit: 'WeAreTheMusicMakers', dynamic: false, name: 'r/WeAreTheMusicMakers', displayName: 'We Are The Music Makers', icon: '♫', color: '#a4459b', colorSoft: '#f7eaf5', category: 'Music',
    description: 'For the part of the song you replay before it even ends. Production details, deep cuts, live sets, and listening closely.', members: 445000, online: 1675, created: 'September 2019', subscribed: false,
    rules: ['Use descriptive titles', 'No taste shaming', 'Self-promo only on Saturdays', 'Official sources only for leaks'], tone: 'Enthusiastic, crate-digging, genre-fluid', vocabulary: ['bridge', 'mix', 'deep cut', 'groove', 'B-side'], typicalUsers: 'Musicians, playlist makers, producers, and liner-note readers', commonTopics: ['production choices', 'album sequencing', 'live arrangements', 'recommendations'], preferredFormats: ['song detail', 'album discussion', 'recommendation chain'], typicalLength: 'Specific and conversational', commentStyle: 'Timestamped details and sprawling recommendation chains', commonOpinions: ['genre labels are maps, not walls'], recurringThemes: ['One-song Friday', 'Perfect transition'], contentToAvoid: ['leaks', 'drive-by self-promo'], moderationStyle: 'Light-touch except around piracy and promotion'
  },
  {
    id: 'sports', sourceSubreddit: 'sports', dynamic: false, name: 'r/sports', displayName: 'Sports', icon: '◎', color: '#2476b8', colorSoft: '#e7f2fa', category: 'Sports',
    description: 'Smart sports conversation without the shouting panel. Tactics, strange stats, fan culture, and the beauty of the long season.', members: 760000, online: 6881, created: 'August 2015', subscribed: false,
    rules: ['No match spoilers in titles for 24 hours', 'Rival fans are guests, not targets', 'Stats need a source', 'No gambling referral links'], tone: 'Lively, analytical, rivalry-friendly', vocabulary: ['shape', 'rotation', 'sample size', 'away end', 'film room'], typicalUsers: 'Fans, amateur analysts, coaches, and stats obsessives', commonTopics: ['tactics', 'roster construction', 'stadium culture', 'underrated players'], preferredFormats: ['post-match thread', 'tactical breakdown', 'stat oddity'], typicalLength: 'Short reactions to long breakdowns', commentStyle: 'Fast banter during games, thoughtful analysis afterward', commonOpinions: ['context matters for every stat'], recurringThemes: ['Weekend watchlist', 'Film room Tuesday'], contentToAvoid: ['abuse', 'gambling spam'], moderationStyle: 'Fast during live events; rivalry without dehumanization'
  },
  {
    id: 'mildlyinteresting', sourceSubreddit: 'mildlyinteresting', dynamic: false, name: 'r/mildlyinteresting', displayName: 'Mildly Interesting', icon: '?!', color: '#e48b28', colorSoft: '#fdf1e1', category: 'Memes',
    description: 'Reality, one degree to the left. Odd signs, accidental comedy, low-stakes surrealism, and very specific memes.', members: 1500000, online: 8243, created: 'May 2017', subscribed: false,
    rules: ['Original titles, please', 'No rage bait', 'Blur personal information', 'Politics only when the joke is genuinely weird'], tone: 'Deadpan, concise, observant', vocabulary: ['well then', 'specific', 'technically correct', 'side quest'], typicalUsers: 'Commuters with cameras, meme makers, and deadpan commenters', commonTopics: ['strange signage', 'failed packaging', 'unexpected animals', 'bureaucratic poetry'], preferredFormats: ['image with dry title', 'tiny story', 'specific meme'], typicalLength: 'As short as the joke permits', commentStyle: 'One-liners, callbacks, and escalating fictional lore', commonOpinions: ['explaining the joke harms the joke'], recurringThemes: ['Found in the wild', 'Extremely specific'], contentToAvoid: ['humiliation', 'personal information', 'reposts under 90 days'], moderationStyle: 'Fast repost checks, light otherwise'
  }
];

const c = (id: string, author: string, avatar: string, body: string, score: number, time: string, replies: Post['commentTree'] = [], flags: Partial<NonNullable<Post['commentTree']>[number]> = {}) => ({ id, author, avatar, body, score, time, replies, ...flags });

export const seedPosts: Post[] = [
  {
    id: 'p1', communityId: 'programming', author: 'heap_of_turtles', avatar: 'HT',
    title: 'The bug was a “temporary” cache from 2019. The fix was deleting 340 lines.',
    body: `We had a checkout service that would occasionally return a price from the previous request. Not often enough to reproduce locally, but often enough to make support miserable.\n\nAfter two days of tracing request IDs, we found an in-memory cache keyed by **product ID but not currency**. It had been added during a launch incident in 2019, with a comment that said “remove after traffic stabilizes.” The original author had left three years ago.\n\nThe satisfying part: after deleting it, p95 got *better* because the cache lock had become the hot path. We also deleted two retry branches that only existed to paper over stale values. Net change: -340 lines, 11 tests added, incident gone.\n\nI am once again asking us to put expiry dates on emergency code.`,
    flair: 'Postmortem', flairColor: '#5b5bd6', score: 4821, comments: 286, time: '3h', type: 'text', readTime: '3 min read', trend: 'hot',
    commentTree: [
      c('p1c1', 'null_reference', 'NR', '“Temporary” is the most permanent dependency category.', 2100, '2h', [
        c('p1c1r1', 'heap_of_turtles', 'HT', 'We have added a lint rule for that word in comments. It does nothing, but it makes us feel observed.', 988, '2h', [], { isOp: true }),
        c('p1c1r2', 'semver_minor', 'SM', 'A load-bearing TODO.', 611, '1h')
      ]),
      c('p1c2', 'packet_gardener', 'PG', 'The detail I appreciate here is that removing the “optimization” improved p95. Caches are distributed systems wearing a fake mustache.', 1473, '2h', [
        c('p1c2r1', 'lru_kidding_me', 'LK', 'And cache invalidation is still one of the two hard things, right after naming the ticket that removes the cache.', 402, '1h')
      ]),
      c('p1c3', 'redteamblue', 'RB', 'We tag incident mitigations with an owner and a deletion date. The build starts warning at 30 days and fails at 60 unless the owner renews it with a reason. Annoying? Yes. Has it prevented this exact archaeology? Also yes.', 809, '1h')
    ]
  },
  {
    id: 'p2', communityId: 'astrophotography', author: 'f8_and_late', avatar: 'F8',
    title: 'One clear hour in Joshua Tree — 14 frames before the clouds returned',
    body: 'Sony A7 III · 20mm f/1.8 at f/2.2 · 14 × 10s · ISO 3200. Sky stacked in Sequator; foreground is a single blue-hour frame from the same tripod position. Gentle curve and color work in Lightroom. Bortle 4 facing southeast.',
    flair: 'Field report', flairColor: '#5468ff', score: 12308, comments: 412, time: '5h', type: 'image', image: '/assets/milky-way.jpg', imageAlt: 'A person standing among desert boulders beneath the Milky Way', trend: 'hot',
    commentTree: [
      c('p2c1', 'darkframeDan', 'DD', 'The restraint in the sky processing is so good. You kept actual darkness instead of lifting every shadow into gray.', 1850, '4h', [
        c('p2c1r1', 'f8_and_late', 'F8', 'Thank you. I reprocessed it twice because my first pass had that crunchy “HDR at midnight” look.', 702, '3h', [], { isOp: true })
      ]),
      c('p2c2', 'coma_corrector', 'CC', 'For anyone new: this is also a great example of why stacking beats simply pushing one ISO 12800 frame. Cleaner color, fewer hot pixels, same natural-looking stars.', 921, '3h'),
      c('p2c3', 'sleep_is_optional', 'SO', 'Drove three hours last new moon and got a uniform layer of clouds. I am choosing to experience this as inspiration and not a personal attack.', 688, '2h')
    ]
  },
  {
    id: 'p3', communityId: 'personalfinance', author: 'slowly_solvent', avatar: 'SS',
    title: 'Crossed $10k in my emergency fund today. Nothing changed, but everything feels different.',
    body: `Three years ago I had $74 after rent and knew exactly which card still had room on it. Today the automatic transfer hit and my emergency fund crossed $10,000.\n\nIt was profoundly boring: $25, then $50, then $125 every payday. Half of every raise. Most of a tax refund. I still drive the dented Civic.\n\nThe number is nice, but the real milestone happened last month when the water heater died and I was annoyed — not scared. I paid the invoice and moved on with my week. That feeling was the whole point.`,
    flair: 'Milestone', flairColor: '#1b8a5a', score: 9344, comments: 530, time: '7h', type: 'text', readTime: '2 min read', trend: 'hot',
    commentTree: [
      c('p3c1', 'indexandchill', 'IC', '“Annoyed, not scared” is the best definition of financial stability I have heard in a while. Congratulations.', 3050, '6h'),
      c('p3c2', 'beans_and_bonds', 'BB', 'This is why emergency funds are not “lazy money.” They are buying the ability to absorb a bad Tuesday without turning it into a bad year.', 1798, '6h', [c('p3c2r1', 'slowly_solvent', 'SS', 'Exactly. The return is sleep.', 1132, '5h', [], { isOp: true })]),
      c('p3c3', 'starting_at_43', 'S4', 'Needed this. I am at $600 and it feels tiny, but six months ago it was zero.', 902, '4h', [c('p3c3r1', 'cashflow_capybara', 'CC', '$600 is the difference between “the tire is flat” and “my whole life is collapsing.” Not tiny.', 1510, '3h')])
    ]
  },
  {
    id: 'p4', communityId: 'mechanicalkeyboards', author: 'escapekeyartist', avatar: 'EA',
    title: 'Built my dad a board he can actually read — high contrast, heavy tactiles, one enormous Escape key',
    body: 'MonsGeek M1 · Kailh Box Navy switches · PBTFans WoB caps · hand-painted lime accents. He keeps spreadsheets open like they owe him money, so the numpad stays. The giant Escape was his only design request.',
    flair: 'Build', flairColor: '#208c74', score: 6715, comments: 348, time: '8h', type: 'image', image: '/assets/keyboard.jpg', imageAlt: 'Close-up of a custom mechanical keyboard with gray, white, and green keys',
    commentTree: [
      c('p4c1', 'spacebaron', 'SB', '“Spreadsheets open like they owe him money” is such a perfect description of a Box Navy user.', 2190, '7h'),
      c('p4c2', 'thockexchange', 'TE', 'This is accessibility done right: ask the person, build for their actual preferences, and make it look intentional rather than clinical.', 1266, '6h'),
      c('p4c3', 'forty_percent_fool', 'FF', 'An enormous Escape key and a full numpad. Your father and I occupy opposite ends of the keyboard ideology spectrum, but I respect him.', 832, '5h')
    ]
  },
  {
    id: 'p5', communityId: 'patientgamers', author: 'credits_roller', avatar: 'CR',
    title: 'I stopped trying to “get through” games and somehow finished more games',
    body: `At some point my hobby turned into project management. I had a backlog tracker, estimated hours, and a rule that I could not start anything new until I finished the current game. Predictably, I spent more time reorganizing the list than playing.\n\nThis year I made one change: after two sessions, I can stop for any reason and it does not go on a “paused” list. It just leaves. No review, no sunk-cost trial, no apology to a recommendation thread.\n\nThe weird result is that I finished seven games — more than any recent year. Apparently giving myself permission to stop made it easier to notice what I actually wanted to continue.`,
    flair: 'Discussion', flairColor: '#a15cce', score: 5388, comments: 623, time: '9h', type: 'text', readTime: '3 min read',
    commentTree: [
      c('p5c1', 'savepointdad', 'SD', 'A backlog is a menu, not a mortgage.', 2760, '8h', [c('p5c1r1', 'credits_roller', 'CR', 'I need this embroidered above my monitor.', 735, '7h', [], { isOp: true })]),
      c('p5c2', 'turnbasedbarista', 'TB', 'Also: sometimes a good game arrives at the wrong time. I bounced off Disco Elysium twice, then played it during a quiet winter and could not put it down. Dropping something is not a permanent verdict.', 1180, '7h'),
      c('p5c3', 'tutorial_skipped', 'TS', 'I use a three-state list now: curious, playing, fond memory. There is deliberately no shame drawer.', 641, '6h')
    ]
  },
  {
    id: 'p6', communityId: 'relationship_advice', author: 'two_mugs_apart', avatar: 'TM',
    title: 'My partner and I solved the same argument for the fifth time. How do we solve the pattern instead?',
    body: `We have a recurring Sunday-night argument. I ask what the week looks like, he hears a request to produce a complete schedule, gets tense, and says “I don't know yet.” I hear that as “planning is your job,” get sharper, and then we are arguing about tone instead of groceries or pickups.\n\nWe always repair it. We apologize. We even understand each other's interpretation afterward. But the exact loop is back two weeks later wearing a different hat.\n\nFor people who have actually changed a recurring conflict — what did you do between arguments? I am not looking for a magic sentence in the moment. I think the moment is already too late.`,
    flair: 'Communication', flairColor: '#e14f6d', score: 2981, comments: 451, time: '2h', type: 'text', readTime: '4 min read', trend: 'rising',
    commentTree: [
      c('p6c1', 'soft_startup', 'SS', 'You already did the hardest part: you described the loop without making either person the villain. Put that paragraph in front of both of you on Saturday, when nobody is activated, and design a ten-minute check-in with a fixed agenda.', 1662, '1h', [
        c('p6c1r1', 'two_mugs_apart', 'TM', 'Saturday instead of Sunday night is embarrassingly obvious now that you say it. Sunday has become part of the trigger.', 611, '1h', [], { isOp: true }),
        c('p6c1r2', 'soft_startup', 'SS', 'Not obvious from inside it! Environment is often easier to change than personality.', 488, '48m')
      ]),
      c('p6c2', 'needs_more_context', 'NC', 'We replaced “what does your week look like?” with three concrete questions: any late nights, any shared errands, any night one of us needs fully off? It made the task bounded.', 948, '1h'),
      c('p6c3', 'notyourtherapistbut', 'NT', 'Small disagreement: I would not focus only on wording. If you are still the one initiating, tracking groceries, and pickups, the underlying labor split may actually need attention too.', 729, '51m')
    ]
  },
  {
    id: 'p7', communityId: 'cozyplaces', author: 'chapter_and_chai', avatar: 'CC',
    title: 'The café was full, the rain got serious, and nobody seemed in a hurry to leave',
    body: 'An accidental two-hour reading break. The book was better for the weather.',
    flair: 'Small comfort', flairColor: '#51718f', score: 8722, comments: 274, time: '11h', type: 'image', image: '/assets/rainy-reading.jpg', imageAlt: 'Books and coffee beside a rain-covered café window',
    commentTree: [
      c('p7c1', 'lamplight_only', 'LO', 'There is a very specific peace in realizing everyone has silently agreed to wait out the rain together.', 1911, '10h'),
      c('p7c2', 'mugseason', 'MS', 'What were you reading?', 622, '9h', [c('p7c2r1', 'chapter_and_chai', 'CC', 'The Summer Book by Tove Jansson. Small, strange, perfect for looking up between pages.', 890, '8h', [], { isOp: true })]),
      c('p7c3', 'busstoppoet', 'BP', 'Rain turning a public place into a temporary living room.', 743, '7h')
    ]
  },
  {
    id: 'p8', communityId: 'cscareerquestions', author: 'calendar_tetris', avatar: 'CT',
    title: 'Got the promotion. Realized I liked the work I just got promoted away from.',
    body: `I spent two years aiming for senior manager because it was the visible next step. I got it in May. More money, kind messages, a title my parents understand.\n\nFour months in, my days are budget negotiation, staffing plans, and translating one leadership meeting into six smaller meetings. I used to mentor two people and still make things. Now I “create leverage,” which seems to mean I forward documents with better summaries.\n\nI am not in crisis and the company did not trick me. I just optimized for advancement without asking whether I wanted the job at the end of it. Has anyone moved back toward an IC role without making it look like a retreat?`,
    flair: 'Career path', flairColor: '#8d6448', score: 3466, comments: 389, time: '4h', type: 'text', readTime: '4 min read', trend: 'rising',
    commentTree: [
      c('p8c1', 'principal_penguin', 'PP', 'I did this. The framing that worked was not “I failed at management,” but “the company gets more value from me solving X-class technical problems.” Bring a concrete IC-shaped gap, not only your dissatisfaction.', 1844, '3h'),
      c('p8c2', 'meeting_declined', 'MD', 'Give it one more quarter if it is tolerable. The first months are unusually heavy on setup and trust-building. You might still dislike the steady state, but make sure you have actually reached it.', 933, '3h', [c('p8c2r1', 'calendar_tetris', 'CT', 'This is fair. I do not want to confuse being bad at a new job with hating the job.', 540, '2h', [], { isOp: true })]),
      c('p8c3', 'orgchart_escapee', 'OE', 'Moved back after 18 months. Some people treated it like a demotion for exactly two weeks; then they needed an incident led and stopped caring.', 780, '2h')
    ]
  },
  {
    id: 'p9', communityId: 'cooking', author: 'pantry_archaeology', avatar: 'PA',
    title: 'What is your “the fridge is empty” dinner that somehow always works?',
    body: 'Mine is crispy rice with a fried egg, whatever pickle exists, and a spoon of chili crisp. My household has eaten it in three apartments and at least four income brackets. Looking for other emergency meals that are more of a system than a recipe.',
    flair: 'Weeknight rescue', flairColor: '#d26a31', score: 4102, comments: 711, time: '6h', type: 'text',
    commentTree: [
      c('p9c1', 'lemonemergency', 'LE', 'Pasta, lemon, butter, black pepper. If there is parmesan, excellent. If not, toasted breadcrumbs make it feel like a decision.', 1860, '5h'),
      c('p9c2', 'tin_fish_tuesday', 'TF', 'White beans warmed with olive oil, garlic, and any sturdy green. Eat with toast. Add vinegar at the end or it tastes weirdly flat.', 1311, '5h', [c('p9c2r1', 'soupweather', 'SW', '“Add vinegar at the end” is the missing final line in about half my dinners.', 729, '4h')]),
      c('p9c3', 'potato_protocol', 'PP', 'Microwave potato, then smash it into a hot pan until the edges get irresponsible. Top according to fridge conditions.', 997, '4h')
    ]
  },
  {
    id: 'p10', communityId: 'science', author: 'methods_section', avatar: 'MS',
    title: 'A small study found a big effect. That should make you more curious — and more cautious.',
    body: `A paper on four-day workweeks is circulating with the headline claim that productivity rose 40%. The result is interesting, but a useful reading needs three details the headline dropped:\n\n• The sample was 14 self-selected firms.\n• Productivity was self-reported by managers who opted into the trial.\n• The confidence interval is wide enough to include a much smaller effect.\n\nNone of that means “the study is bad” or four-day weeks do not work. It means this is promising pilot evidence, not a settled effect size. The right next sentence is “let's run a larger preregistered study,” not “science proves Friday is obsolete.”`,
    flair: 'Methods', flairColor: '#087f8c', score: 5209, comments: 298, time: '10h', type: 'text', readTime: '3 min read',
    commentTree: [
      c('p10c1', 'bayesian_bagel', 'BB', 'Small samples do produce real discoveries. They also produce unstable estimates. “Exciting and uncertain” is a perfectly valid category that headlines seem structurally unable to express.', 2112, '9h'),
      c('p10c2', 'labcoat_optional', 'LO', 'The self-selection issue may matter even more than n=14. Companies willing to trial this probably have unusual management and knowledge-work setups.', 1044, '8h'),
      c('p10c3', 'fourth_author', 'FA', 'Paper link for everyone arriving from the newsletter summary: [link]. Table 3 has the firm-level breakdown and it is much more heterogeneous than the pooled number suggests.', 801, '7h')
    ]
  },
  {
    id: 'p11', communityId: 'diy', author: 'measure_twice_ish', avatar: 'MT',
    title: 'Turned the useless 19 cm gap beside my fridge into a rolling pantry ($46, no wall anchors)',
    body: 'Three pine boards, six dowels, locking casters, and one afternoon. It holds cans two-deep without blocking the fridge vent. Full cut list and the mistake I made with caster clearance are in the first comment.',
    flair: 'Before & after', flairColor: '#b67842', score: 2268, comments: 126, time: '5h', type: 'text',
    commentTree: [
      c('p11c1', 'codeandcabinets', 'CC', 'Please keep that air gap exactly as shown. This is the first fridge-gap build I have seen here that does not slowly cook the compressor. Nice work.', 730, '4h'),
      c('p11c2', 'measure_twice_ish', 'MT', 'Cut list: two 74 × 18 cm sides, four 55 × 18 cm shelves, 8 mm dowels. I would use 50 mm casters, not 40 — the bottom shelf scraped until I added washers.', 612, '4h', [], { isOp: true }),
      c('p11c3', 'renterwizard', 'RW', 'The tiny handle matching the cabinets is what sells it. It reads as built-in until you pull it out.', 398, '3h')
    ]
  },
  {
    id: 'p12', communityId: 'decidingtobebetter', author: 'one_sock_forward', avatar: 'OS',
    title: 'I opened the envelope I have been moving around my desk for eleven days.',
    body: 'It took four minutes. The dread had somehow become a full-time employee. It is done now.',
    flair: 'It counts', flairColor: '#d45f83', score: 7120, comments: 391, time: '1h', type: 'text', trend: 'rising',
    commentTree: [
      c('p12c1', 'taskconfetti', 'TC', 'You fired the dread employee. Severance: four minutes.', 2144, '58m'),
      c('p12c2', 'laterbecametoday', 'LT', 'This reminded me to make the phone call. Seven minutes, including hold music. Thank you, stranger.', 981, '44m'),
      c('p12c3', 'one_sock_forward', 'OS', 'Look at us, briefly terrifying the administrative world.', 1200, '39m', [], { isOp: true })
    ]
  }
];

export const currentUser = {
  name: 'mossy_sidewalk', displayName: 'Maya Chen', avatar: 'MC', karma: 12840, joined: 'May 2023', bio: 'Developer, over-waterer of plants, collector of very specific playlists.', posts: 18, comments: 347
};

export const trendingTopics = [
  { tag: 'Tiny tools', community: 'r/programming', posts: '1.8k posts' },
  { tag: 'New moon', community: 'r/astrophotography', posts: '942 posts' },
  { tag: 'No-spend September', community: 'r/personalfinance', posts: '3.2k posts' },
  { tag: 'One-pan dinners', community: 'r/Cooking', posts: '2.1k posts' }
];

export const categoryIcons: Record<string, string> = {
  Programming: '⌘', Photography: '◉', Hobbies: '◇', Gaming: '◈', 'Personal finance': '↗', Food: '⌁', Travel: '⌖', Relationships: '♡', Lifestyle: '☀', DIY: '⌂', 'Movies & TV': '▻', Fitness: '↟', Career: '☕', History: '⌛', Cars: '◒', Science: '∿', Music: '♫', Sports: '◎', Memes: '?!'
};
