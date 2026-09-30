# Fora — an infinite, AI-written Reddit

Fora is a static web app that simulates Reddit at any scale. Search **any** subreddit — `r/Deltarune`,
`r/BuyItForLife`, something that was created yesterday — and Fora reads what that community is actually
talking about right now, learns its topics, running jokes, tone and post formats, then **writes brand-new
posts and comment threads in that style, forever, as you scroll.**

Nothing is copied. Real Reddit posts are used only as *signal*: they are reduced to statistics — topic
clusters, recurring names, tone measurements, format ratios — and the original text is thrown away before
a single word is generated. Every post you see is synthetic, is labelled as synthetic, and was never
written by a real Reddit user.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/
```

No API key, no server, no account. It runs on GitHub Pages as-is.

---

## What it does

| | |
|---|---|
| **Search anything** | Type a subreddit that does not exist in the app yet and it is created live, with its own icon, colours, rules, flairs and culture. |
| **Reads the real sub** | Pulls public listings (`hot`, `new`, `rising`, `top/week`) and analyses them for what the community cares about *today*. |
| **Writes originals** | Generates posts, bodies, poll options, image concepts and nested comment trees from that analysis. Never reproduces source text. |
| **Never runs out** | Scrolling generates the next batch indefinitely. Batches drift: topics blend, new angles appear, formats rotate. |
| **Stays honest** | Every post carries an `AI` pill, every community page carries a simulation banner, and the context badge always says whether the signal is live, cached or estimated. |
| **Degrades gracefully** | Reddit unreachable? It falls back to cached context, then to a derived offline profile, and keeps working. |
| **Optional real LLM** | Paste an OpenAI, Gemini, Anthropic or OpenAI-compatible key in Settings to swap the built-in engine for a real model. Stored in your browser only. |

---

## How a community gets built

```
search "Deltarune"
        │
        ▼
┌──────────────────────┐   listings: hot · new · rising · top/week
│  redditContext.ts    │   transport chain, first one that works wins
└──────────┬───────────┘
           ▼
┌──────────────────────┐   topic clusters · entities · phrases · slang
│ cultureAnalysis.ts   │   tone · format mix · flairs · recurring threads
└──────────┬───────────┘   → CultureProfile   (source text discarded here)
           ▼
┌──────────────────────┐   sanitize signal · cache · registry · batching
│    simulation.ts     │
└──────────┬───────────┘
           ▼
┌──────────────────────┐   20 archetypes → title · body · concept · poll
│    synthesis.ts      │   → comment tree · scores · ages · authors
│  (or llmClient.ts)   │
└──────────┬───────────┘
           ▼
     an endless feed
```

### 1. Fetching context — `src/services/redditContext.ts`

Reddit's JSON endpoints do not send CORS headers to browsers, so Fora tries a chain of transports and
remembers whichever one worked:

1. your own proxy template (Settings → Reddit context)
2. `/reddit-json/*` — the Vite dev proxy, local development only
3. `api.allorigins.win`
4. `api.codetabs.com`
5. `corsproxy.io`
6. `r.jina.ai`
7. a direct request to `www.reddit.com` (works in some environments, fails in most)

Only public, read-only listings are requested. Over-18 and quarantined subreddits are refused outright.

### 2. Analysis — `src/services/cultureAnalysis.ts`

A `SubredditSnapshot` becomes a `CultureProfile`:

- **Topic clusters** — co-occurring terms grouped into labelled clusters with a heat score, a momentum
  (`rising` / `steady` / `cooling`, from how much of the mass sits in `new` and `rising` versus `top/week`)
  and a kind (`theory`, `meme`, `question`, `media`, `general`).
- **Entities** — capitalised recurring names: characters, tools, teams, places.
- **Phrases and slang** — bigrams and community-specific vocabulary, stop-worded against general English.
- **Tone** — humour, formality, question rate, lowercase rate, exclamation and emoji rate, average title
  length, self-post rate, spoiler rate. All measured, none hand-written.
- **Format mix** — the text/image/link/poll ratio the sub actually posts in.
- **Flairs and recurring threads** — real flair names and weekly/daily megathread patterns.

That profile is the *entire* handoff to generation. No source titles, no source bodies, no usernames.

### 3. Generation — `src/services/synthesis.ts`

The default engine is a key-free generator that runs in your browser. It works from **20 post archetypes**
— theory, hot take, showcase, meme concept, hypothetical, crossover, recurring thread, help, appreciation,
shitpost, poll, update, discussion, question, recommendation, observation, newcomer, analysis, rant,
milestone — each with its own title patterns, body scaffolds, comment behaviour and flair preferences.

Archetype weights come from the profile, so a joke-heavy sub produces mostly memes and shitposts while a
long-form sub produces analysis and discussion. Each post is assembled from a topic cluster (sometimes two,
blended), an entity, a phrase, the sub's vocabulary and a category lexicon, then run through tone matching
— lowercase titles, spoiler tags, exclamation habits, typical title length.

Novelty is enforced per community with three ledgers: used titles, used `archetype × topic × subject`
signatures, and used title patterns. A sentence never repeats inside a body, and a comment never repeats
inside a thread. Verified: **90 posts over 15 scroll batches produced 90 unique titles.**

Batches drift as you scroll — later batches blend more topics, reach further down the cluster list, and
favour different archetypes, so the feed keeps moving instead of looping.

### 4. Optional real models — `src/services/llmClient.ts`

Settings → Generation engine accepts an OpenAI, Gemini, Anthropic or OpenAI-compatible endpoint. The key
is kept in `localStorage`, called directly from your browser, and never sent anywhere else. The model gets
the same `CultureProfile` — a statistical brief, never real post text — and is asked for JSON. If the call
fails, is rate-limited, or returns junk, the built-in engine silently takes over so the feed never stalls.

---

## What you see in the UI

- **Home** — a blended feed from your subscribed communities, infinite on scroll.
- **Any community** — hero, context badge, sort tabs (Hot / New / Top / Rising), infinite feed, and a
  **Context** tab showing the topic radar with heat and momentum, the format mix, entity and slang chips,
  live flairs, recurring threads, and where the signal came from.
- **Post detail** — full body, poll, image concept card, and a generated comment tree with OP replies,
  mod notes, nested disagreement and the sub's own comment style.
- **Discover** — every built-in and every community you have created.
- **Settings** — generation engine, Reddit context proxy, theme, and a plain-language explanation of what
  is real and what is not.

The 20 built-in communities (`r/programming`, `r/Cooking`, `r/AskHistorians`, `r/mildlyinteresting`, …)
ship with hand-written seed posts so the app is populated on first load. Everything after that is generated.

---

## Honesty and safety

- Every generated post shows an **AI** pill; every community page shows a simulation banner.
- The context badge is always visible: **Live context** / **Cached context** / **Estimated profile**, with
  the reason when live fetching fails.
- Authors are generated handles built from the community's own vocabulary. They are not real Reddit users,
  and no real username is ever displayed.
- Real post text is never rendered, stored, or cached — only derived statistics are.
- A blocked-terms filter runs twice: once on the incoming signal, once on the generated output.
- Over-18, quarantined and banned subreddits are refused.
- Images on seed posts are labelled **Illustrative image**.

---

## Project layout

```
src/
  App.tsx                     all UI: routing, feed, post detail, context panel, settings
  data.ts                     20 built-in communities, seed posts, local user
  types.ts                    CultureProfile, Post, CommunityProfile, ModelSettings, …
  styles.css                  design system + simulation layer
  services/
    redditContext.ts          transport chain, listing fetch, subreddit search
    cultureAnalysis.ts        snapshot → CultureProfile
    offlineProfiles.ts        estimated profiles for known subs, built-in fallbacks
    synthesis.ts              key-free generator: 20 archetypes, bodies, comments, polls
    llmClient.ts              optional OpenAI / Gemini / Anthropic / custom providers
    simulation.ts             registry, context cache, batching, safety filters
```

### Local storage

`fora-transport`, `fora-custom-proxy`, `fora-model-settings`, `fora-communities-v2`,
`fora-ctx-v2:<sub>`, `fora-ctx-index-v2`, `fora-votes`, `fora-saved`, `fora-subscribed-v2`, `fora-theme`.
Context entries expire after 40 minutes; at most 30 are kept. Clearing site data resets everything.

### Deploying

`npm run build` emits a fully static `dist/`. Set `BASE_PATH` for project pages:

```bash
BASE_PATH=/Reddit/ npm run build
```

---

## Limitations

- Public CORS mirrors are rate-limited and go down. When they all fail, Fora runs on estimated profiles —
  still endless, just not current. Point it at your own proxy in Settings for reliability.
- The built-in engine is a strong template-and-signal system, not a language model. It is fast, free and
  offline; a real model key produces more surprising prose.
- Fora is not affiliated with Reddit. It is a simulation, and it says so on every screen.
