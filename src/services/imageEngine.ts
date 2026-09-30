/**
 * Image generation through a Cloudflare Worker running FLUX.2 on Workers AI.
 *
 * The site is static, so it never holds Cloudflare credentials. It calls an
 * OpenAI-compatible endpoint — `POST {base}/v1/images/generations` — which is
 * the contract exposed by `cloudflare-image-mcp` and by the Worker in
 * `worker/` in this repository. Point Settings at either one.
 *
 * Generation is lazy and budgeted. An infinite feed could otherwise fire
 * hundreds of inference calls on a single scroll, so:
 *   - only an image post that is actually on screen asks for a picture;
 *   - identical prompts are served from an in-memory cache;
 *   - a per-session budget caps total generations;
 *   - a single in-flight request per prompt is shared between callers.
 */

import type { CultureProfile, Post } from '../types';
import { DEFAULT_FLUX_MODEL, DEFAULT_IMAGE_WORKER } from '../config/providers';

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface ImageSettings {
  enabled: boolean;
  /** Worker base URL, e.g. https://cloudflare-image-workers.<sub>.workers.dev */
  workerUrl: string;
  /** Optional bearer token if the Worker was deployed with API_KEYS set. */
  workerKey: string;
  model: string;
  /** Hard cap on generations per browser session. */
  budget: number;
}

const SETTINGS_KEY = 'fora-image-settings';

export const defaultImageSettings: ImageSettings = {
  enabled: true,
  workerUrl: DEFAULT_IMAGE_WORKER,
  workerKey: '',
  model: DEFAULT_FLUX_MODEL,
  budget: 40,
};

export function loadImageSettings(): ImageSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultImageSettings };
    const parsed = JSON.parse(raw) as Partial<ImageSettings>;
    return {
      enabled: parsed.enabled ?? true,
      workerUrl: typeof parsed.workerUrl === 'string' ? parsed.workerUrl.trim() : DEFAULT_IMAGE_WORKER,
      workerKey: typeof parsed.workerKey === 'string' ? parsed.workerKey : '',
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : DEFAULT_FLUX_MODEL,
      budget: typeof parsed.budget === 'number' ? Math.max(0, Math.min(500, parsed.budget)) : 40,
    };
  } catch {
    return { ...defaultImageSettings };
  }
}

export function saveImageSettings(settings: ImageSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* private mode */
  }
}

export function imagesConfigured(settings: ImageSettings): boolean {
  return settings.enabled && /^https:\/\/.+/i.test(settings.workerUrl.trim());
}

/* ------------------------------------------------------------------ */
/* Prompt building                                                     */
/* ------------------------------------------------------------------ */

/**
 * Styles that keep output clearly illustrative. Generated pictures must never
 * be mistakable for a real photograph of a real event or person, so photoreal
 * and documentary styles are deliberately absent.
 */
const STYLES = [
  'flat vector editorial illustration, bold shapes, limited palette',
  'soft gouache illustration, textured paper, warm light',
  'clean isometric 3D render, matte pastel materials, studio lighting',
  'screen-printed poster art, two spot colours, halftone texture',
  'loose ink and watercolour sketch, expressive linework',
  'retro risograph print, grainy overprint, muted duotone',
];

const BANNED_IMAGE_TERMS =
  /\b(nude|nudity|nsfw|gore|blood|corpse|slur|swastika|nazi|isis|porn|sexual|underage|child)\b/i;

/** Strip anything that should not reach an image model. */
function sanitizePrompt(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[<>{}]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 420);
}

/**
 * Build a picture prompt from a post's described concept.
 *
 * The generator already writes image posts as a *concept* (a setup and a
 * punchline) rather than pretending to have a photo. That concept is exactly
 * the right thing to draw.
 */
export function promptForPost(post: Post, profile?: CultureProfile): string | null {
  const parts: string[] = [];
  if (post.concept) {
    if (post.concept.format) parts.push(post.concept.format);
    if (post.concept.setup) parts.push(post.concept.setup);
    if (post.concept.punchline) parts.push(post.concept.punchline);
  }
  if (!parts.length && post.title) parts.push(post.title);
  if (!parts.length) return null;

  const subject = sanitizePrompt(parts.join('. '));
  if (!subject || BANNED_IMAGE_TERMS.test(subject)) return null;

  const theme = post.topicLabel || profile?.topics[0]?.label || '';
  const style = STYLES[Math.abs(hash(post.id)) % STYLES.length];
  const context = theme ? ` Theme: ${sanitizePrompt(theme)}.` : '';

  return `${subject}.${context} ${style}. No text, no words, no lettering, no watermark, no real people, no logos.`;
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
let spent = 0;
let lastError = '';

export function imageStats() {
  return { spent, cached: cache.size, lastError };
}

export function resetImageBudget() {
  spent = 0;
  lastError = '';
}

interface GenerationResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string } | string;
}

/**
 * Generate one picture. Returns a displayable URL, or null when generation is
 * off, over budget, or unavailable — callers fall back to the concept card.
 */
export async function generateImage(
  post: Post,
  options: { settings?: ImageSettings; profile?: CultureProfile; signal?: AbortSignal } = {},
): Promise<string | null> {
  const settings = options.settings || loadImageSettings();
  if (!imagesConfigured(settings)) return null;

  const prompt = promptForPost(post, options.profile);
  if (!prompt) return null;

  const key = `${settings.model}::${prompt}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;

  if (spent >= settings.budget) {
    lastError = `Session image budget reached (${settings.budget})`;
    return null;
  }

  const request = (async (): Promise<string | null> => {
    const base = settings.workerUrl.trim().replace(/\/$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (settings.workerKey.trim()) headers.Authorization = `Bearer ${settings.workerKey.trim()}`;

    try {
      spent += 1;
      const response = await fetch(`${base}/v1/images/generations`, {
        method: 'POST',
        signal: options.signal,
        headers,
        body: JSON.stringify({
          model: settings.model,
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
          // Deterministic per post, so a re-render does not redraw.
          seed: Math.abs(hash(post.id)) % 2_000_000,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Worker returned ${response.status}${text ? `: ${text.slice(0, 140)}` : ''}`);
      }

      const payload = (await response.json()) as GenerationResponse;
      const first = payload.data?.[0];
      if (!first) throw new Error('Worker returned no image');

      const url = first.b64_json ? `data:image/png;base64,${first.b64_json}` : first.url || '';
      if (!url) throw new Error('Worker returned an empty image');

      cache.set(key, url);
      lastError = '';
      return url;
    } catch (error) {
      spent = Math.max(0, spent - 1); // a failed call did not consume quota
      lastError = error instanceof Error ? error.message : 'Image generation failed';
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

/** Settings helper: confirm the Worker is reachable and wired to Workers AI. */
export async function testImageWorker(settings: ImageSettings): Promise<{ ok: boolean; detail: string }> {
  const base = settings.workerUrl.trim().replace(/\/$/, '');
  if (!/^https:\/\/.+/i.test(base)) return { ok: false, detail: 'Enter the https URL of your deployed Worker' };
  try {
    const response = await fetch(`${base}/health`, { method: 'GET' });
    if (!response.ok) return { ok: false, detail: `Worker health check returned ${response.status}` };
    const body = (await response.json().catch(() => ({}))) as { status?: string; models?: number };
    return {
      ok: true,
      detail: body.models ? `Worker healthy — ${body.models} models available` : 'Worker healthy',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unreachable';
    return {
      ok: false,
      detail: /Failed to fetch|NetworkError|Load failed/i.test(message)
        ? 'Could not reach the Worker — check the URL and that CORS is enabled'
        : message,
    };
  }
}
