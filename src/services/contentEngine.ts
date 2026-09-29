import { communities } from '../data';
import type { Comment, CommunityProfile, Post, SortOption } from '../types';

/**
 * Provider boundary for a production AI service. The UI and feed never depend on
 * vendor-specific response shapes. A server implementation can stream the same
 * validated Post objects from a model, while this local provider keeps the demo
 * populated, fast, and deterministic.
 */
export interface ContentGenerationRequest {
  community: CommunityProfile;
  recentTitles: string[];
  requestedTypes: Post['type'][];
  /** Optional provider-neutral creative intent, used here to select a cached content blueprint. */
  intent?: string;
  seed: number;
}

export interface AIContentProvider {
  generatePost(request: ContentGenerationRequest): Promise<Post>;
  generateComments(post: Post, community: CommunityProfile, seed: number): Promise<Comment[]>;
}

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
  confidence: number;
}

const blockedPatterns = [
  /\b(?:buy now|limited offer|referral code)\b/i,
  /\b(?:doxx|home address)\b/i,
  /\b(?:racial superiority|ethnic cleansing)\b/i,
  /\b(?:instructions to (?:build|make) a bomb)\b/i,
];

export function moderateContent(text: string, community: CommunityProfile): ModerationResult {
  const reasons = blockedPatterns.filter(pattern => pattern.test(text)).map(pattern => `Matched safety pattern: ${pattern.source}`);
  if (community.contentToAvoid.some(term => text.toLowerCase().includes(term.toLowerCase()))) {
    reasons.push('Conflicts with this community’s content profile');
  }
  return { approved: reasons.length === 0, reasons, confidence: reasons.length ? 0.94 : 0.88 };
}

type Recipe = {
  communityId: string;
  title: string;
  body: string;
  flair: string;
  author: string;
  type?: Post['type'];
  domain?: string;
  replies: [string, string, number][];
  pollOptions?: { label: string; votes: number }[];
};

const recipes: Recipe[] = [
  {
    communityId: 'devcraft', author: 'regex_in_recovery', flair: 'Discussion',
    title: 'What tiny internal tool paid for itself almost immediately?',
    body: 'I spent a Friday afternoon making a CLI that creates a sanitized production snapshot for local debugging. It is maybe 180 lines and has prevented more speculative “cannot reproduce” fixes than our expensive observability dashboard. What is your boring little tool that quietly changed the work?',
    replies: [
      ['branch_manager', 'A script that tells you *why* a feature flag is active: default, org override, user override, or experiment. It ended an entire category of Slack archaeology.', 842],
      ['csv_apologist', 'A CSV diff that understands primary keys instead of comparing lines. Ugly output, beloved by twelve people.', 513],
      ['old_man_yells_at_cloud', 'One button that provisions the local stack with believable data. Onboarding went from two days to an hour.', 388]
    ]
  },
  {
    communityId: 'devcraft', author: 'eventually_consistent', flair: 'Architecture',
    title: 'We replaced six microservices with one service. Here is what actually got worse.',
    body: 'The deployment and debugging story is dramatically simpler. Local development works again. But ownership became blurrier, one slow test suite now blocks everyone, and our release notes have become a negotiation. I still think consolidation was right; I just wish “monolith” discussions admitted the organizational tradeoffs alongside the technical ones.',
    replies: [
      ['bounded_context', 'This is the useful version of the conversation. Boundaries do not disappear when processes merge; they just stop being enforced by the network.', 1204],
      ['tcp_over_coffee', 'A modular monolith needs someone actively defending the modules or entropy makes one large service-shaped mud puddle.', 691],
      ['junior_by_thursday', 'Local development working is not a small win. The number of bugs I can investigate went from “my service” to “the product.”', 477]
    ]
  },
  {
    communityId: 'nightpixels', author: 'redlight_reader', flair: 'Question',
    title: 'How do you decide a night is not worth the two-hour drive?',
    body: 'The forecast says 12% cloud cover but mediocre transparency, and the moon will not set until 1:40. I have spent enough nights watching a cloud bank form directly above my tripod to know optimism is not a forecast. What is your personal go/no-go threshold?',
    replies: [
      ['dew_heater', 'I need two of three: good transparency, low wind, no work the next morning. Clear Outside has betrayed me less since I made sleep part of the forecast.', 592],
      ['bortle_bortle', 'Satellite loop before leaving, then I check weather stations *upwind*. A percentage over your pin hides what is coming.', 431],
      ['tracker_snacker', 'If the drive is pretty, I go and bring binoculars. Lowering the stakes has saved this hobby for me.', 350]
    ]
  },
  {
    communityId: 'keycaps', author: 'gasketcase', flair: 'Budget build',
    title: '$92 all-in, no foam, and it sounds better than the board I spent six months “perfecting”',
    body: 'GMK67, stock Akko Cream Yellow Pros, clearance PBT caps, stabilizers clipped and lubed. That is it. I kept reaching for it while my supposedly finished aluminum build sat three feet away. Apparently my preferred sound profile is “cheap plastic done well.”',
    replies: [
      ['wallet_hot_swap', 'Budget boards unlocked the forbidden technique: leaving things alone.', 1103],
      ['plate_material', 'Plastic gets dismissed as cheap when “slightly flexible and acoustically forgiving” is exactly what many people are modding toward.', 674],
      ['endgame_17', 'Congratulations on your new expensive-keyboard storage system.', 512]
    ]
  },
  {
    communityId: 'patientplayers', author: 'mapmarker_ignored', flair: 'Finished it',
    title: 'Control is at its best when you stop understanding the building',
    body: 'I nearly dropped it because I kept treating the Oldest House like a map to clear. Once I stopped chasing every marker, the impossible architecture and office bureaucracy started doing the real work. The combat never completely clicked for me, but the Ashtray Maze landed because the game had taught me to expect corridors, not spectacle.',
    replies: [
      ['threshold_kid', 'The setting carries that game for me. I read every memo because half of them are workplace comedy written during an apocalypse.', 948],
      ['launch_day_later', 'Funny, the combat is what kept me through the vague upgrade system. Throwing office furniture remains a perfect mechanic.', 623],
      ['fridge_duty', 'The side mission with the refrigerator is still one of my favorite bits of environmental absurdity.', 389]
    ]
  },
  {
    communityId: 'patientplayers', author: 'difficulty_curious', flair: 'Discussion',
    title: 'What game became better when you lowered the difficulty?',
    body: 'I dropped Guardians of the Galaxy to easy about four hours in. The fights stopped overstaying their welcome and the character banter no longer got cut off by me repeating encounters. It made me wonder which games are accidentally hiding their best quality behind the default challenge.',
    replies: [
      ['storymode_sommelier', 'The Witcher 3. I wanted preparation and monsters, but not twenty sword sponges between conversations.', 1230],
      ['parry_this_post', 'Counterpoint: Jedi Fallen Order only made sense to me once I raised it and had to learn the parry timing. Depends what the game is good at teaching.', 720],
      ['manual_save', 'Anything with resource scarcity that mainly makes me hoard every interesting tool “for later.”', 602]
    ]
  },
  {
    communityId: 'pocketwisdom', author: 'automate_the_boring', flair: 'Budget review',
    title: 'My budget was failing because I made every month pretend to be a normal month',
    body: 'Car registration, birthdays, annual subscriptions, two dentist visits — none of these are surprises, but I treated them like emergencies. I added up last year’s “weird” expenses, divided by 12, and started a $310 monthly true-expenses transfer. My monthly budget finally looks less impressive and works much better.',
    replies: [
      ['sinkingfeelinggood', 'The first honest budget often looks worse than the fantasy budget. Then it feels much better.', 1441],
      ['annualized_anxiety', 'I went through a full year of card statements and found $4,600 of “one-time” costs. Humbling and useful.', 875],
      ['spreadsheet_frog', 'This is the point where a budget changes from fortune-telling to planning.', 611]
    ]
  },
  {
    communityId: 'homeplate', author: 'crumb_structure', flair: 'Recipe rescue',
    title: 'Why does my focaccia look magnificent and taste like a kitchen sponge?',
    body: 'The outside is golden, the dimples are dramatic, and the crumb springs back. But it tastes bland and oddly wet. 80% hydration, overnight fridge proof, baked at 220°C for 24 minutes. I used 9g salt for 500g flour because I was afraid of over-salting it. Is this just a salt issue or am I underbaking too?',
    replies: [
      ['fermentation_station', 'Both. That is 1.8% salt, which is not disastrous, but focaccia can happily take 2.3–2.5%. More importantly, check the center temperature; 24 minutes in a thick pan may simply be early.', 887],
      ['oliveoilspill', 'Let it cool longer than feels emotionally reasonable. Cutting warm high-hydration bread can read as gummy even when baked.', 644],
      ['saltygrandma', 'Salt the dough, salt the brine, flaky salt the top. Focaccia is not where we go to be timid.', 572]
    ]
  },
  {
    communityId: 'homeplate', author: 'wok_this_way', flair: 'Technique',
    title: 'The best improvement to my stir-fry was cooking half as much stir-fry',
    body: 'Same pan, same burner, same ingredients — but two portions instead of four. The vegetables char instead of steaming and the sauce clings instead of pooling. I now cook in two batches and combine at the end. It takes six extra minutes and tastes like I bought a stronger stove.',
    replies: [
      ['fond_of_fond', 'Crowding is the tax we pay for optimism.', 1309],
      ['batch_casual', 'Preheating the pan between batches matters too. The second batch used to be my sad batch until I stopped rushing.', 534],
      ['weeknight_wizard', 'I do protein, vegetables, then combine. Three rounds sounds fussy until you realize each is about two minutes.', 390]
    ]
  },
  {
    communityId: 'thelongweekend', author: 'platform_changed', flair: 'Trip report',
    title: 'Five days by local train through northern Spain: what I would cut next time',
    body: 'Bilbao → Santander → Oviedo → León in early September, €690 excluding flights. The FEVE coast train was slow in the best way, but four cities was one too many. I would drop León, give Oviedo a second full day, and stop pretending a travel day is also a sightseeing day. Practical notes: buy FEVE tickets at the station, pack food, and sit on the right leaving Santander.',
    replies: [
      ['windowseat_union', '“Stop pretending a travel day is a sightseeing day” is the lesson I relearn on every trip.', 942],
      ['asturias_local', 'Good call on Oviedo. For a second day, take the bus to the pre-Romanesque churches early and walk back if the weather holds.', 612],
      ['carryon_onlyish', 'Did the €690 include single rooms? That is impressively low for September.', 305]
    ]
  },
  {
    communityId: 'themiddledistance', author: 'friendship_calendar', flair: 'Friendship',
    title: 'I stopped waiting for friendship to be spontaneous',
    body: 'My closest college friend and I spent two years saying “we should catch up soon.” In January I finally proposed the first Tuesday of every month, 8 pm, twenty minutes minimum. It felt absurdly formal. We have missed twice, talked for two hours other times, and are closer than we have been in years. Adult friendship apparently needed a recurring calendar invite.',
    replies: [
      ['thirdplacehunter', 'Structure is not the opposite of affection. It is often how affection survives logistics.', 2201],
      ['voice_note_veteran', 'My friend and I send one long voice note every Sunday. Asynchronous changed everything across time zones.', 843],
      ['spontaneity_retired', 'We schedule a quarterly “nothing weekend” six months ahead. It looks corporate in the calendar and feels wonderful in person.', 610]
    ]
  },
  {
    communityId: 'rainywindows', author: 'quietkettle', flair: 'Check-in',
    title: 'Rain on the fire escape. Soup on the stove. Phone in the other room.',
    body: 'That is the whole plan tonight. What is your small weather ritual?',
    replies: [
      ['wool_socks', 'I open the window half an inch, make tea, and let the apartment smell like rain until it gets too cold.', 713],
      ['libraryumbrella', 'Walk to the library under the big umbrella. The return trip with new books feels ceremonial.', 466],
      ['softthunder', 'No overhead lights. This is important.', 590]
    ]
  },
  {
    communityId: 'smallspaces', author: 'tape_outline', flair: 'Layout help',
    title: 'A dining table fits on paper. Blue tape says absolutely not.',
    body: 'I was ready to order a 120 cm round table for this 3.1 × 3.4 m room. Taped the footprint plus chair clearance and discovered I would have to turn sideways to reach the balcony. The 90 cm square feels less elegant but actually leaves a home around it. Posting this as your reminder to mock up furniture at full size.',
    replies: [
      ['cardboard_carpenter', 'I add cardboard “people” in the chairs because otherwise I optimistically overlap the chair clearance with the walkway.', 782],
      ['cornerbanquette', 'Consider a 100 cm pedestal table. Losing legs at the corners buys more usable seating than the dimensions suggest.', 440],
      ['room_for_error', 'My beautiful sofa also looked excellent as a tape rectangle. Unlike the sofa, the tape bent around the stair landing.', 351]
    ]
  },
  {
    communityId: 'screeningroom', author: 'continuity_coffee', flair: 'Scene discussion',
    title: 'What quiet scene tells you exactly what movie you are watching?',
    body: 'For me it is the coin toss in *No Country for Old Men*. No score, no exposition, almost no movement — just blocking, pauses, and the clerk slowly realizing the stakes. The rest of the movie is already there in miniature. What is another scene that works like a mission statement?',
    replies: [
      ['framebyframe', 'The opening breakfast in Phantom Thread. Every sound and glance establishes appetite, control, ritual, and the cost of interrupting any of them.', 1128],
      ['subtext_subtitles', 'The convenience-store walk in Before Sunrise. It quietly tells you the film trusts talk, time, and tiny evasions.', 776],
      ['wide_shot', 'Arrival: Louise entering the military tent. The overlapping questions and half-heard answers tell you uncertainty will be the point, not an obstacle to rush through.', 559]
    ]
  },
  {
    communityId: 'liftlearnrepeat', author: 'deload_dad', flair: 'Training log',
    title: 'My best eight-week block started with removing one day from my program',
    body: 'I kept failing four-day programs because work and a toddler reliably ate one session. Switched to three full-body days, capped sessions at 55 minutes, and treated the optional conditioning day as genuinely optional. Hit rep PRs on squat and bench this week. The program got less optimal and I got more consistent.',
    replies: [
      ['minimum_effective', 'A program you complete is not less optimal than one you repeatedly miss.', 1670],
      ['rpeanutbutter', 'The optional day has to be emotionally optional. If skipping it feels like failure, you still wrote a four-day program.', 809],
      ['sleep_sets_reps', 'Parents need programs with error tolerance built in, not a tiny-font disclaimer about recovery.', 588]
    ]
  },
  {
    communityId: 'deskbreak', author: 'reply_all_survivor', flair: 'Tiny work win',
    title: 'Replaced our weekly status meeting with a document. Nobody has asked for the meeting back.',
    body: 'Six people × 45 minutes is 4.5 hours, before context switching. We now update three bullets by noon Tuesday: changed, blocked, deciding. If something needs discussion, the relevant people make a 15-minute call. Week four and the document is better attended than the meeting ever was.',
    replies: [
      ['agenda_or_decline', 'The key is that “deciding” bullet. Most async updates fail because they report without giving the reader anything to do.', 998],
      ['manager_material', 'Save the before-and-after. This is exactly the kind of unglamorous leverage that belongs in a performance review.', 672],
      ['camera_off', 'Somewhere, a calendar invite just became a butterfly.', 541]
    ]
  },
  {
    communityId: 'historythreads', author: 'archive_mouse', flair: 'Source spotlight',
    title: 'Medieval shopping lists are much more interesting than royal decrees',
    body: 'I spent today with a 14th-century household account from York. Between wool purchases and stable costs, somebody recorded two repaired pans, saffron for a feast, payment to a messenger who got soaked, and replacement laces for three pairs of shoes. Administrative records are where historical people stop posing for us.',
    replies: [
      ['material_culture', 'Household accounts are also wonderful for tracing what counted as repairable. Objects we treat as disposable had entire working lives.', 1072],
      ['citation_needed', 'Could you share the archive reference? I work on urban food prices and would love to see the saffron entry in context.', 425],
      ['archive_mouse', 'BIA HC/SA/4, fols. 17r–22v. The messenger note is 19v and delightfully grumpy.', 608]
    ]
  },
  {
    communityId: 'garageatlas', author: 'tenmillimeteraway', flair: 'Repair log',
    title: 'Solved a battery drain with a $9 glovebox switch and three evenings of wrong guesses',
    body: '2008 Honda Fit, 1.5L. Battery dropped from 12.7V to 11.9V overnight. Alternator tested fine. Parasitic draw was 410 mA until I pulled the interior-light fuse. Turns out the glovebox light stayed on with the door closed because the tiny plunger cracked. Posting the numbers so the next person does not replace a perfectly good alternator.',
    replies: [
      ['multimetermaid', 'Symptoms, measured draw, isolation step, root cause. Frame this repair post and hang it in the sidebar.', 1290],
      ['fit_for_purpose', 'On older Fits, also check the hatch latch if that fuse is the culprit. Same failure, harder to see in daylight.', 598],
      ['parts_cannon', 'My deepest respect for resisting the parts cannon for three whole evenings.', 411]
    ]
  },
  {
    communityId: 'tinywins', author: 'sink_zero', flair: 'It counts',
    title: 'There are no dishes in my sink. Please respect my privacy during this historic moment.',
    body: 'The counter is visible too. I do not know who I have become, but I support them.',
    replies: [
      ['domestic_archivist', 'Document the site before nature reclaims it.', 1411],
      ['five_minute_timer', 'Proud of you and this rare geological event.', 720],
      ['tomorrows_mug', 'I am drinking water directly beside my clean glass because I refuse to be the first one to ruin it.', 609]
    ]
  },
  {
    communityId: 'signalscience', author: 'errorbars', flair: 'Paper club',
    title: 'This “failed replication” may be telling us where the effect lives',
    body: 'The original memory study recruited undergraduates in a quiet lab. The replication used a broader online sample and found almost no aggregate effect. But preregistered subgroup analysis suggests it persists under low-distraction conditions. That is not a rescue of the original claim; it is a narrower, testable claim replacing it. Link and methods notes below.',
    replies: [
      ['latent_variable', 'This is the productive side of replication: not a scoreboard, but a tool for mapping boundary conditions.', 965],
      ['power_analysis', 'Worth noting the subgroup interval is still broad. A direct test stratified by distraction level would be much stronger than slicing this sample again.', 708],
      ['open_data_please', 'Data and code are unusually clean, too. I reran Figure 2 without issue.', 402]
    ]
  },
  {
    communityId: 'loopstation', author: 'second_verse', flair: 'Production detail',
    title: 'Songs where the bass quietly becomes the lead instrument',
    body: 'Not bass solos — I mean arrangements where you suddenly realize the melody, momentum, and emotional center have all migrated downward. “The Less I Know the Better” is the obvious example. Looking for subtler ones where it sneaks up on you halfway through.',
    replies: [
      ['lowendtheory', '“The Chain” after the breakdown is almost too obvious, but the bass does not just lead — it announces the second half of the song.', 870],
      ['headphones_required', 'Talk Talk’s “Happiness Is Easy.” The bass keeps making melodic decisions while everything else behaves like atmosphere.', 490],
      ['motown_stem', 'Isolated Jamerson tracks will ruin your definition of accompaniment in the best way.', 423]
    ]
  },
  {
    communityId: 'sidelines', author: 'chalkboardultra', flair: 'Tactics',
    title: 'The most important substitution happened ten minutes before the player came on',
    body: 'Everyone is crediting the 72nd-minute winger change, but watch what happened at 61: the left back stopped overlapping and moved inside during buildup. That pinned the opposing midfielder centrally and created the lane the substitute later attacked. The personnel change finished a tactical change already underway.',
    replies: [
      ['halfspace_hero', 'Exactly. People read substitutions as new ideas when they are often the last step of an adjustment the players have been implementing for ten minutes.', 902],
      ['setpiececivilian', 'The broadcast angle hid this completely. Behind-goal footage makes the midfield shift obvious.', 518],
      ['awayday', 'Credit to the left back too. Spent half an hour sprinting outside, then changed role without losing concentration.', 377]
    ]
  },
  {
    communityId: 'mildlyabsurd', author: 'sign_reader', flair: 'Found in the wild',
    title: 'The library printer now has a “please do not negotiate with the printer” sign',
    body: 'There is a second, smaller sign underneath that says “it has nothing to offer you.”',
    replies: [
      ['paper_jam_session', 'Finally, management acknowledges the printer’s bargaining tactics.', 1890],
      ['cyan_missing', 'It has altered the deal. Pray it does not alter it further.', 1012],
      ['reference_desk', 'Librarian here. The second sign was added after an incident.', 1403]
    ]
  },
  {
    communityId: 'devcraft', author: 'diff_happens', flair: 'Code review',
    title: 'A code review comment changed how our team writes “simple” functions',
    body: 'The comment was: “What fact would have to change for this condition to stop being true?” We were reviewing a six-line permissions helper, but nobody could answer without opening four files. We did not need more comments; we needed the policy named and owned in one place. I have started asking this on any boolean that smuggles in business logic.',
    replies: [
      ['boolean_trap', 'Named predicates are tiny architecture documents. `canEditInvoice` gives you somewhere to put the reason; three inline comparisons do not.', 1044],
      ['comments_optional', 'This is also a better review question than “can we simplify this?” It identifies the change axis instead of asking for fewer characters.', 622],
      ['policy_engineer', 'The danger is making one enormous permission oracle. Cohesion still matters, even when centralization feels tidy.', 417]
    ]
  },
  {
    communityId: 'devcraft', author: 'rollback_enjoyer', flair: 'What broke in prod?',
    title: 'Our safest deployment failed because the rollback was never tested forward',
    body: 'We rehearsed rollback from v42 to v41 three times. Production failed halfway through v42, leaving one additive database migration applied. Rolling back the app was safe, but rolling forward later was not: the migration runner saw the existing column and stopped. The incident was mild; the lesson was not. We now test deploy → partial migration → rollback → deploy again.',
    replies: [
      ['migration_pigeon', 'Idempotency only becomes real after the second run.', 1188],
      ['schema_scholar', 'This is why I prefer expand/contract migrations even when a one-shot ALTER looks harmless. Recovery paths are part of the feature.', 704],
      ['pagerduty_poet', 'A rollback is not the end of a deployment. It is a new starting state.', 489]
    ]
  },
  {
    communityId: 'nightpixels', author: 'foreground_problem', flair: 'Processing',
    title: 'I finally stopped making the foreground brighter than it was in person',
    body: 'My old edits treated every rock as information that deserved recovery. Last night I pulled the foreground two stops down, let several shapes merge into silhouette, and the sky suddenly felt large again. Technical capability had quietly become a compulsion to show everything.',
    replies: [
      ['shadow_detail', 'Dynamic range is an option, not an obligation. Darkness can be subject matter.', 932],
      ['histogram_hiker', 'The useful test for me is shrinking the image. If the foreground competes at thumbnail size, it is usually too loud.', 551],
      ['tracked_and_tired', 'I needed to hear this before reopening my last edit for the ninth time.', 368]
    ]
  },
  {
    communityId: 'nightpixels', author: 'polar_aligned', flair: 'First light',
    title: 'First tracked image, first time my 50mm did not turn every star into rice',
    body: 'Star Adventurer 2i · Nikon Z6 · 50mm at f/2.8 · 24 × 45s · ISO 800. Polar alignment took me forty minutes and I framed the wrong patch of sky twice. The final stack is not dramatic, but the tiny round stars feel like a personal engineering victory.',
    replies: [
      ['north_star_neighbor', 'Round stars at 45 seconds on night one is genuinely excellent. Framing while the tracker is moving remains comedy for everyone.', 881],
      ['intervalometer', 'Keep this stack forever. Your first clean tracked frame becomes a useful reminder when you start obsessing over sub-pixels.', 510],
      ['dew_point', 'Check the lower left for a tiny bit of tilt, but do not touch anything until you have repeated it. One field session is not a diagnosis.', 344]
    ]
  },
  {
    communityId: 'keycaps', author: 'office_ninja', flair: 'Switch review',
    title: 'Silent switches are not silent, but my coworkers stopped knowing when I was annoyed',
    body: 'Two weeks with TTC Frozen Silents in a plastic 65%. They feel a little like landing on dense rubber, and the spacebar still gives me away, but the sharp upstroke is gone. In a quiet office they read as “person typing” instead of “tiny skeleton running down a hallway.”',
    replies: [
      ['meeting_muted', 'The spacebar is always the informant. A thin strip of foam inside mine made more difference than swapping the alphas.', 902],
      ['tactile_tax', 'I miss the crisp return more than the sound. Silents are a comfort decision, not a free acoustic upgrade.', 573],
      ['hr_approved_thock', 'Please add “tiny skeleton hallway” to the official switch sound taxonomy.', 690]
    ]
  },
  {
    communityId: 'keycaps', author: 'layout_limbo', flair: 'Buying advice',
    title: '75% owners: do you actually use the function row or just enjoy the rectangle?',
    body: 'I am deciding between a 65% and 75% for a shared work/gaming desk. I use F2, F5, and F12 enough to notice, but not enough to know whether a layer would bother me. Interested in people who moved either direction and stayed there — not looking for another “buy both” intervention.',
    replies: [
      ['debug_key', 'As a developer, F5 and F12 on a layer lasted three days. Dedicated keys are worth one extra row to me.', 745],
      ['sixtyfivealive', 'I mapped tap for numbers, hold for F-keys. It took a week and now a function row feels far away.', 493],
      ['endgame_enabler', 'I respect your boundary and will merely note that hot-swap boards retain value.', 618]
    ]
  },
  {
    communityId: 'pocketwisdom', author: 'raise_allocated', flair: 'Decision help',
    title: 'Got a 9% raise. How much should improve today and how much should help future me?',
    body: 'After tax it is about $310 more each month. Retirement is at 12%, emergency fund covers four months, no high-interest debt. My instinct is $150 to retirement, $100 to travel, and $60 to make grocery shopping less of an optimization problem. I know the mathematically best answer; I am asking what split people actually sustained.',
    replies: [
      ['present_value_person', 'Your proposed split is excellent because all three versions of you receive something: future, adventurous, and hungry Tuesday you.', 1322],
      ['match_point', 'Set the automatic pieces before the first larger paycheck lands. Lifestyle creep is less sneaky when it has a named allowance.', 720],
      ['broccoli_budget', 'The grocery $60 may have the highest quality-of-life return in the entire plan.', 593]
    ]
  },
  {
    communityId: 'pocketwisdom', author: 'subscription_sleuth', flair: 'Small win',
    title: 'My subscription audit saved $18, not $180 — still keeping the win',
    body: 'I expected a dramatic pile of forgotten services. Turns out I use almost everything. I cancelled one weather app and downgraded cloud storage. The useful result was not the money; it was knowing the recurring list is intentional. Financial maintenance can be successful even when it does not uncover a villain.',
    replies: [
      ['budget_mythbuster', 'Avoided the classic move of cancelling useful things, feeling deprived, and resubscribing at a higher price.', 804],
      ['eighteen_dollars', '$216 a year and less uncertainty is not nothing.', 655],
      ['intentional_spender', 'Audits are verification, not treasure hunts. This is a good outcome.', 478]
    ]
  },
  {
    communityId: 'homeplate', author: 'acid_tested', flair: 'Technique',
    title: 'I fixed a flat pot of soup one teaspoon at a time',
    body: 'Salt was correct. Texture was good. It still tasted like ingredients standing near each other. I ladled a cup into a bowl and tested lemon juice in quarter-teaspoon additions. At one teaspoon, it suddenly tasted like soup. Scaled that back into the pot and wrote the amount down like I had discovered electricity.',
    replies: [
      ['vinegar_finisher', 'Acid does not make food taste acidic until you overshoot; before that it often just makes it taste more itself.', 1230],
      ['bay_leaf_believer', 'Testing in a small bowl is the real lesson. Much cheaper than making a brave decision over six liters.', 731],
      ['stock_option', 'For lentil soup, red wine vinegar is my light switch. For chicken, lemon.', 466]
    ]
  },
  {
    communityId: 'homeplate', author: 'knife_drawer', flair: 'Beginner question',
    title: 'Which knife skill made cooking noticeably less annoying?',
    body: 'Not asking for the fanciest cut. I learned to slice an onion with the root holding everything together and suddenly prep stopped feeling like chasing loose cubes around a board. What other small technique removes friction every night?',
    replies: [
      ['claw_grip', 'Use the side of the knife to move food, not the sharp edge. Your edge stays sharp and chopped garlic stops falling off your hands.', 1191],
      ['celery_geometry', 'Cut round vegetables in half first. A flat side is both safer and faster.', 843],
      ['mise_enough', 'Learning when precision does *not* matter. Rustic soup does not care about your 8 mm dice.', 700]
    ]
  },
  {
    communityId: 'themiddledistance', author: 'trip_spreadsheet', flair: 'Friendship',
    title: 'I am the planner friend, and I think my friends have mistaken competence for preference',
    body: 'I booked our last four group weekends because I am good at it, not because comparing eight train times brings me joy. When I waited for someone else this year, nothing happened and everyone asked whether I was “still organizing the trip.” How do I step back without turning it into a test they do not know they are taking?',
    replies: [
      ['explicit_is_kind', 'Do not silently step back. Say: “I want to go, and I need someone else to own lodging. If nobody wants that job, let us skip this one.” That is a boundary, not a test.', 1602],
      ['labor_visible', 'Split ownership, not tasks. If you still remind someone to book the hotel, you are still project managing the hotel.', 911],
      ['happy_passenger', 'Former passenger friend here: I honestly thought my planner friend enjoyed control. I was embarrassed when she told us, then relieved to know how to help.', 698]
    ]
  },
  {
    communityId: 'themiddledistance', author: 'repair_in_progress', flair: 'Update',
    title: 'Update: I apologized without explaining why I did it',
    body: 'A month ago I asked how to repair after getting defensive with my sister. The advice that stuck was to stop making her sit through my internal courtroom. I said what I did, named the impact, and asked what would help — no paragraph beginning with “I was stressed.” The conversation was ten minutes and felt more honest than my usual hour-long apologies.',
    replies: [
      ['impact_statement', '“Internal courtroom” is such an accurate phrase. An apology is not the appeal hearing for your self-image.', 1904],
      ['context_later', 'Context can belong in the later conversation about preventing recurrence. It does not need to be the price of admission to remorse.', 1002],
      ['sister_signal', 'The shorter apology probably left actual space for your sister to respond.', 633]
    ]
  },
  {
    communityId: 'deskbreak', author: 'camera_optional', flair: 'Manager perspective',
    title: 'I stopped requiring cameras and the meeting got more engaged',
    body: 'I inherited a “cameras on = collaboration” norm. I made video optional, but added a real agenda and started asking named, answerable questions instead of “any thoughts?” Participation went up. It turns out seeing twelve faces was not the same as designing a meeting where twelve people had a reason to speak.',
    replies: [
      ['facilitate_this', 'A camera policy was doing the emotional work your agenda now does properly.', 1238],
      ['remote_since_before', 'Named questions also give quieter people a few seconds to prepare instead of rewarding the fastest interrupter.', 801],
      ['blurred_background', 'I turn mine on for introductions and sensitive one-on-ones. Default-off made using it feel meaningful again.', 447]
    ]
  },
  {
    communityId: 'deskbreak', author: 'interview_debrief', flair: 'Job search',
    title: 'The interview went well until every person described success differently',
    body: 'The hiring manager said the first six months are about stabilizing operations. A peer said they need someone to rebuild trust across teams. The director said the mandate is aggressive growth. Each answer sounds reasonable alone; together they sound like three jobs sharing one calendar. Is this a red flag or just normal executive ambiguity?',
    replies: [
      ['first_ninety', 'Ask them in writing which outcome breaks the tie when stability and growth conflict. The response matters more than the original inconsistency.', 1077],
      ['org_designated', 'Not automatically a red flag, but it is definitely the work. They are hiring a person where they have failed to align a mandate.', 736],
      ['offer_considered', 'I would also ask how your performance will be measured. Ambiguous goals become dangerous at review time.', 602]
    ]
  },
  {
    communityId: 'signalscience', author: 'correlation_station', flair: 'Headline check',
    title: 'No, this study did not find that houseplants make people productive',
    body: 'It found that offices with more visible greenery had higher self-reported focus in a cross-sectional survey. The authors explicitly list office quality and employer investment as likely confounds. “Plants cause productivity” is a charming hypothesis, but this design does not test it. I still like my pothos; it simply has not earned authorship on my quarterly report.',
    replies: [
      ['confounding_ficus', 'The pothos demands a correction and co-first authorship.', 1220],
      ['causal_diagram', 'Office quality is such an obvious backdoor path here. Better-funded offices can afford both plants and conditions that help focus.', 810],
      ['greenhouse_effectsize', 'Useful finding for generating hypotheses, poor finding for buying ten thousand corporate succulents.', 531]
    ]
  },
  {
    communityId: 'signalscience', author: 'null_result', flair: 'Research life',
    title: 'Our null result became the most useful figure in the paper',
    body: 'We expected the intervention to improve recall overall. It did not. But plotting individual trajectories showed the baseline model was unusually stable across three sites, which let us rule out a measurement concern that had bothered the field for years. The flashy hypothesis failed; the boring instrument validation may actually get reused.',
    replies: [
      ['methods_over_myth', 'This is why a null result is not an empty result. A well-powered failure can move uncertainty somewhere more useful.', 1066],
      ['reviewer_twoish', 'Please put the validation in the abstract. Do not bury the durable contribution because it was not the planned headline.', 744],
      ['lab_notebook', 'Also release the site-level calibration data if consent allows. That could save several labs a pilot.', 402]
    ]
  }
];

const palette = ['#5b5bd6', '#208c74', '#d26a31', '#a15cce', '#157f9a', '#e14f6d'];
const avatars = ['AJ', 'BK', 'CR', 'DN', 'EL', 'FM', 'GP', 'HS', 'IR', 'JT'];

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return Math.abs(h);
}

function makeComments(recipe: Recipe, seed: number): Comment[] {
  return recipe.replies.map(([author, body, score], index) => ({
    id: `g-${seed}-c-${index}`,
    author,
    avatar: author.split('_').map(v => v[0]).join('').slice(0, 2).toUpperCase(),
    body,
    score: Math.max(3, Math.round(score * (0.86 + ((seed + index * 13) % 29) / 100))),
    time: index === 0 ? '1h' : `${index + 1}h`,
    replies: index === 0 && seed % 3 === 0 ? [{
      id: `g-${seed}-c-${index}-r`,
      author: recipe.author,
      avatar: recipe.author.slice(0, 2).toUpperCase(),
      body: 'This is exactly the kind of perspective I was hoping for. Thank you.',
      score: Math.round(score * 0.24), time: '42m', isOp: true, replies: []
    }] : []
  }));
}

export class MockCommunityAIProvider implements AIContentProvider {
  async generatePost(request: ContentGenerationRequest): Promise<Post> {
    const available = recipes.filter(recipe => recipe.communityId === request.community.id);
    const all = available.length ? available : recipes;
    const requestedRecipe = request.intent ? all.find(recipe => recipe.title === request.intent) : undefined;
    const recipe = requestedRecipe || all[request.seed % all.length];
    const scoreBase = 320 + (hash(recipe.title + request.seed) % 6200);
    const comments = 24 + (hash(recipe.author + request.seed) % 680);
    const post: Post = {
      id: `generated-${request.seed}-${hash(recipe.title)}`,
      communityId: recipe.communityId,
      author: recipe.author,
      avatar: avatars[request.seed % avatars.length],
      title: recipe.title,
      body: recipe.body,
      flair: recipe.flair,
      flairColor: request.community.color || palette[request.seed % palette.length],
      score: scoreBase,
      comments,
      time: request.seed % 4 === 0 ? `${12 + (request.seed % 42)}m` : `${1 + (request.seed % 14)}h`,
      type: recipe.type || (recipe.pollOptions ? 'poll' : 'text'),
      domain: recipe.domain,
      readTime: recipe.body.length > 500 ? `${2 + (recipe.body.length % 4)} min read` : undefined,
      trend: request.seed % 4 === 0 ? 'rising' : request.seed % 5 === 0 ? 'hot' : undefined,
      pollOptions: recipe.pollOptions,
      commentTree: makeComments(recipe, request.seed)
    };
    const check = moderateContent(`${post.title}\n${post.body}`, request.community);
    if (!check.approved) throw new Error('Generated post did not pass automated moderation');
    return post;
  }

  async generateComments(post: Post, _community: CommunityProfile, seed: number): Promise<Comment[]> {
    const recipe = recipes.find(item => item.title === post.title);
    return recipe ? makeComments(recipe, seed) : [];
  }
}

export class ContentCache {
  private posts = new Map<string, Post[]>();

  get(key: string): Post[] | undefined {
    return this.posts.get(key)?.map(post => ({ ...post }));
  }

  set(key: string, value: Post[]) {
    this.posts.set(key, value.map(post => ({ ...post })));
  }
}

const provider = new MockCommunityAIProvider();
const cache = new ContentCache();
let batchNumber = 0;

export async function generateFeedBatch(
  subscribedIds: string[],
  recentPosts: Post[],
  sort: SortOption,
  size = 5
): Promise<Post[]> {
  const cacheKey = `${sort}-${batchNumber}-${subscribedIds.slice().sort().join('.')}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const eligibleRecipes = recipes.filter(recipe => subscribedIds.includes(recipe.communityId));
  const pool = eligibleRecipes.length ? eligibleRecipes : recipes;
  const start = (batchNumber * size) % pool.length;
  const selected = Array.from({ length: Math.min(size, pool.length) }, (_, index) => pool[(start + index) % pool.length]);
  batchNumber += 1;

  const posts = await Promise.all(selected.map(async (recipe, index) => {
    const community = communities.find(item => item.id === recipe.communityId) || communities[0];
    const seed = batchNumber * 97 + index * 17 + hash(sort);
    return provider.generatePost({
      community,
      recentTitles: recentPosts.slice(-25).map(post => post.title),
      requestedTypes: ['text', 'image', 'poll', 'link'],
      intent: recipe.title,
      seed
    });
  }));

  cache.set(cacheKey, posts);
  return posts;
}

export async function generateCommunityPosts(communityId: string, size = 2): Promise<Post[]> {
  const community = communities.find(item => item.id === communityId);
  if (!community) return [];
  const available = recipes.filter(recipe => recipe.communityId === communityId);
  if (!available.length) return [];
  const count = Math.min(size, available.length);
  return Promise.all(Array.from({ length: count }, (_, index) => provider.generatePost({
    community,
    recentTitles: [],
    requestedTypes: ['text', 'image', 'poll', 'link'],
    intent: available[index].title,
    // Consecutive values intentionally select distinct recipes for this community.
    seed: index + available.length * (hash(communityId) % 1000)
  })));
}

export function getGenerationContext(community: CommunityProfile) {
  return {
    identity: `${community.displayName}: ${community.description}`,
    voice: community.tone,
    vocabulary: community.vocabulary,
    audience: community.typicalUsers,
    topics: community.commonTopics,
    formats: community.preferredFormats,
    length: community.typicalLength,
    commentCulture: community.commentStyle,
    norms: community.commonOpinions,
    avoid: community.contentToAvoid,
    moderation: community.moderationStyle
  };
}
