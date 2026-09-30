# Getting `cloudflare-image-mcp` to deploy

Findings from inspecting `lordmannu993/cloudflare-image-mcp` at commit `58f1258`.

I could not fix this repository directly — the credentials available to me are scoped to
`lordmannu993/Reddit` only (`gh api repos/lordmannu993/cloudflare-image-mcp` reports
`push: false`), so I could not push a branch, open a PR, or trigger a workflow there.
What follows is the diagnosis and a patch you can apply in about a minute.

## What is *not* wrong

Worth stating, because it narrows the search:

- **The code is fine.** `npm ci && npm run check` in `workers/` passes with no errors.
- **CORS is already correct** — `Access-Control-Allow-Origin: *` on every response, including
  an `OPTIONS` preflight handler.
- **FLUX.2 is already wired up.** `workers/src/config/models.json` already registers
  `flux-2-dev`, `flux-2-klein-4b` and `flux-2-klein-9b`, and `image-generator.ts` already
  handles their multipart input format. You do not need to add Flux 2 — it is there.

## The actual blockers

### 1. The workflow has never run — not once

`gh run list -R lordmannu993/cloudflare-image-mcp` returns **zero runs**. That is the
headline symptom: this was never a failing deploy, it was a deploy that never started.

Two causes, both of which apply:

- **GitHub disables Actions on forked repositories by default.** Until you open the
  **Actions** tab and click *"I understand my workflows, go ahead and enable them"*,
  nothing will ever trigger.
- **The push trigger is path-filtered.** It only fires on pushes to `main` that touch
  `workers/**`. Forking and adding secrets touches neither, so even with Actions enabled
  there is nothing to trigger it. Use **Run workflow** (`workflow_dispatch`) instead.

### 2. The R2 bucket does not exist

The workflow generates a `wrangler.toml` containing:

```toml
[[r2_buckets]]
binding = "IMAGE_BUCKET"
bucket_name = "cloudflare-image-mcp-images"
```

`wrangler deploy` refuses to deploy a Worker whose R2 binding points at a bucket that
does not exist — it fails with *"The specified bucket does not exist"*. Nothing in the
workflow creates it. This is the failure you would have hit first had the workflow run.

### 3. `environment: production` on a fresh fork

The deploy job declares `environment: production`. That refers to a GitHub *Environment*,
not a plain string. On a fork that environment does not exist, and if you stored your
Cloudflare credentials as **repository** secrets they are not what the job resolves
against. Removing the line makes repository secrets work as expected.

### 4. No `[ai]` binding

The generated `wrangler.toml` has no Workers AI binding, so the Worker can only reach
FLUX through the REST API using `CLOUDFLARE_API_TOKEN` at runtime. That works, but it
means the token needs Workers AI permissions and a token rotation breaks image
generation. Adding `[ai]` gives the Worker a first-class binding.

## The fix

```bash
git clone https://github.com/lordmannu993/cloudflare-image-mcp
cd cloudflare-image-mcp
git apply /path/to/cloudflare-image-mcp-deploy.patch   # ships next to this file
git commit -am "Fix Workers deployment: create R2 bucket, drop missing environment, add AI binding"
git push
```

The patch (`cloudflare-image-mcp-deploy.patch`, verified to apply cleanly to `58f1258`):

1. removes `environment:` from the deploy job;
2. adds an idempotent **Ensure R2 bucket exists** step before deploying;
3. adds the `[ai]` binding to the generated `wrangler.toml`;
4. moves `compatibility_date` from `2025-01-01` to `2026-09-01`.

Then, in the repository:

1. **Actions tab → enable workflows.**
2. **Settings → Secrets and variables → Actions**, confirm `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` are **repository** secrets.
3. **Actions → Deploy to Cloudflare Workers → Run workflow.**

### API token permissions

Create the token from *My Profile → API Tokens → Create Custom Token* with:

| Scope | Permission | Needed for |
| --- | --- | --- |
| Account · Workers Scripts | Edit | deploying the Worker |
| Account · Workers R2 Storage | Edit | creating and using the bucket |
| Account · Workers AI | Read | running FLUX.2 |
| Account · Account Settings | Read | the "Derive Workers URL" step |

If the last one is missing, the deploy still succeeds — only the URL-printing step fails.

### One more thing

`workers/package.json` pins `@cloudflare/workers-types@^4` while current `wrangler`
declares a peer dependency on `^5`. `npm ci` is unaffected because the lockfile pins
`wrangler@4.60.0`, but a plain `npm install` will fail with `ERESOLVE`. Bump it to
`^5.20260926.1` when you next touch the dependencies.

## Using it from this site

Once deployed, the Worker exposes `POST /v1/images/generations`. That is the same
OpenAI-compatible contract this site speaks, so paste the deployed URL into
**Settings → Pictures → Worker base URL** and image posts start rendering real FLUX.2
pictures. No other change is required.

If you would rather not debug that repository at all, `worker/` in this repository is a
small self-contained Worker that serves the same endpoint, needs no R2 bucket, and
additionally proxies Jev decisions so the Jev key can stay server-side. See
`worker/README.md`.
