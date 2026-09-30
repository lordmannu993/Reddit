/**
 * Provider configuration.
 *
 * ── Read this before adding anything here ──────────────────────────────────
 * This file is bundled into the static site. Everything in it is PUBLIC: it
 * ships to every visitor's browser and is readable in the deployed JavaScript.
 *
 * Only a key whose owner has explicitly accepted public exposure belongs here.
 *
 * Keys that must NEVER appear in this file (or anywhere else in `src/`):
 *   - the Gemini / OpenAI / Anthropic text-generation key. Those are entered by
 *     the user in Settings, kept in localStorage on their own device, sent only
 *     to the provider's own https origin as a request header, and redacted from
 *     every error path. See `src/services/llmClient.ts`.
 *   - the Cloudflare API token. That lives as a Worker secret, server-side.
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Jev AI typed-decision key.
 *
 * Supplied by the repository owner, who stated it is a free key and accepted
 * that it is public. Jev's own documentation recommends server-side use, so the
 * client prefers a Worker proxy when one is configured and only falls back to a
 * direct browser call using this key.
 *
 * Override at build time with `VITE_JEV_API_KEY`, or per-device in Settings.
 */
export const BUNDLED_JEV_KEY = (import.meta.env.VITE_JEV_API_KEY as string | undefined)
  || 'jev_ssQtT0kP53vqL13DiPnN7H8yfn6UuRGG';

/** Jev AI hosted decision endpoint. */
export const JEV_BASE_URL = 'https://jev-ai.pro/api';

/** Stable Jev alias. `jev-preview` and pinned versions also work. */
export const JEV_MODEL = 'jev-latest';

/**
 * Default Cloudflare Worker base URL for image generation.
 *
 * Empty by default: the Worker is deployed into the user's own Cloudflare
 * account, so the URL is per-deployment and is set in Settings. Build with
 * `VITE_IMAGE_WORKER_URL=https://…workers.dev` to bake in a default.
 */
export const DEFAULT_IMAGE_WORKER = (import.meta.env.VITE_IMAGE_WORKER_URL as string | undefined) || '';

/** FLUX.2 models available on Cloudflare Workers AI, fastest first. */
export const FLUX_MODELS = [
  { id: '@cf/black-forest-labs/flux-2-klein-4b', label: 'FLUX.2 klein 4B — fastest', steps: 4 },
  { id: '@cf/black-forest-labs/flux-2-klein-9b', label: 'FLUX.2 klein 9B — balanced', steps: 4 },
  { id: '@cf/black-forest-labs/flux-2-dev', label: 'FLUX.2 dev — highest detail', steps: 12 },
] as const;

export const DEFAULT_FLUX_MODEL = FLUX_MODELS[0].id;
