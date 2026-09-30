# Fora edge Worker

A small Cloudflare Worker that gives the static site two things it cannot do by itself:
**pictures** (FLUX.2 on Workers AI) and **server-side Jev decisions** (so the Jev key does
not have to ship in the browser bundle).

It is deliberately minimal. No R2 bucket, no database, no build step — which removes the
most common first-deploy failures.

## Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | liveness, which models are available, whether decisions are enabled |
| `/v1/images/generations` | POST | OpenAI-compatible image generation on FLUX.2 |
| `/v1/decisions` | POST | validating proxy to the Jev AI typed-decision API |

`/v1/images/generations` matches the OpenAI image API, which is also what
`cloudflare-image-mcp` serves — the site works against either without code changes.

```bash
curl -X POST https://fora-edge.<your-subdomain>.workers.dev/v1/images/generations \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a cosy reading nook, flat vector illustration","size":"1024x1024"}'
```

```json
{ "created": 1790000000, "model": "@cf/black-forest-labs/flux-2-klein-4b", "via": "binding",
  "data": [{ "b64_json": "…", "revised_prompt": "…" }] }
```

## Models

| Model | Notes |
| --- | --- |
| `@cf/black-forest-labs/flux-2-klein-4b` | default — distilled, built for latency-critical use |
| `@cf/black-forest-labs/flux-2-klein-9b` | more capable, still fast |
| `@cf/black-forest-labs/flux-2-dev` | highest detail, slowest |
| `@cf/black-forest-labs/flux-1-schnell` | previous generation, kept as a fallback |

Anything not on this list is rejected and replaced with the default, so the Worker cannot
be used to run arbitrary models on your account.

## Deploy

### Through GitHub Actions (recommended)

Add these **repository** secrets, then run the **Deploy edge Worker** workflow:

| Secret | Required | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | yes | token with *Workers Scripts: Edit* and *Workers AI: Read* |
| `CLOUDFLARE_ACCOUNT_ID` | yes | your account id |
| `JEV_API_KEY` | no | enables `/v1/decisions`; the key stays on the Worker |
| `WORKER_API_KEYS` | no | comma-separated bearer tokens that lock the Worker down |

### By hand

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy

# optional
npx wrangler secret put JEV_API_KEY
npx wrangler secret put API_KEYS
```

Then paste the printed `https://fora-edge.<subdomain>.workers.dev` URL into the site under
**Settings → Pictures**.

## Configuration

Set in `wrangler.jsonc` under `vars`:

- `ALLOWED_ORIGINS` — comma-separated browser origins, e.g. `https://lordmannu993.github.io`.
  Empty means `*`. Set it once the site is deployed.

Set as secrets, never in the file:

- `JEV_API_KEY` — without it `/v1/decisions` returns `501` and the site quietly skips curation.
- `API_KEYS` — when set, every request needs `Authorization: Bearer <one of them>`.
- `CF_ACCOUNT_ID` / `CF_AI_TOKEN` — only for the REST fallback, if the `AI` binding ever fails.

## Cost control

Workers AI is billed per inference, and an infinite feed can request a lot of them. The
protections live on both sides:

- the browser only asks for a picture when a post actually scrolls into view;
- identical prompts are served from an in-memory cache and never re-requested;
- there is a per-session cap, configurable in Settings, defaulting to 40 images;
- responses carry `Cache-Control: public, max-age=86400`, so Cloudflare's edge serves
  repeat views without re-running the model;
- setting `API_KEYS` stops anyone else from spending your quota.

## Local development

```bash
cd worker
npm install
npx wrangler dev          # http://localhost:8787
echo 'JEV_API_KEY=…' > .dev.vars   # gitignored
```

`env.AI` needs network access to Cloudflare, so image generation returns `502` in a
fully offline sandbox. Routing, validation, CORS and auth all work offline.
