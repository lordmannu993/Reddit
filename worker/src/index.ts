/**
 * Fora edge Worker.
 *
 * Two jobs, both of which exist so that a static site never has to hold a
 * credential it should not have:
 *
 *   POST /v1/images/generations   FLUX.2 on Cloudflare Workers AI.
 *                                 OpenAI-compatible, so the site works against
 *                                 this Worker or against cloudflare-image-mcp
 *                                 without changing a line.
 *
 *   POST /v1/decisions            Jev AI typed decisions, with the Jev key held
 *                                 here as a Worker secret instead of shipping
 *                                 in the browser bundle.
 *
 *   GET  /health                  Liveness plus what is actually wired up.
 *
 * Deploy: see worker/README.md. The only required binding is `AI`; everything
 * else is optional and degrades cleanly.
 */

export interface Env {
  /** Workers AI binding. Declared in wrangler.jsonc — no token needed at runtime. */
  AI: {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  };
  /** Optional: comma-separated bearer tokens. When set, the API requires one. */
  API_KEYS?: string;
  /** Optional: comma-separated allowed browser origins. Defaults to '*'. */
  ALLOWED_ORIGINS?: string;
  /** Optional: Jev AI key. Without it, /v1/decisions returns 501. */
  JEV_API_KEY?: string;
  /** Optional: override the Jev base URL. */
  JEV_BASE_URL?: string;
  /** Optional REST fallback for image generation. */
  CF_ACCOUNT_ID?: string;
  CF_AI_TOKEN?: string;
  DEPLOYED_AT?: string;
  COMMIT_SHA?: string;
}

/** FLUX.2 text-to-image models available on Workers AI. */
const IMAGE_MODELS = new Set([
  '@cf/black-forest-labs/flux-2-klein-4b',
  '@cf/black-forest-labs/flux-2-klein-9b',
  '@cf/black-forest-labs/flux-2-dev',
  '@cf/black-forest-labs/flux-1-schnell',
]);

const DEFAULT_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_PROMPT = 1800;
const MAX_BODY_BYTES = 32_000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function corsHeaders(env: Env, request: Request): Record<string, string> {
  const configured = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  let allow = '*';
  if (configured.length) {
    allow = configured.includes(origin) ? origin : configured[0];
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function fail(message: string, status: number, headers: Record<string, string>): Response {
  return json({ error: { message, type: 'invalid_request_error', code: status } }, status, headers);
}

/** Optional bearer auth. No API_KEYS configured means the Worker is public. */
function authorised(request: Request, env: Env): boolean {
  const configured = (env.API_KEYS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!configured.length) return true;
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return Boolean(token) && configured.includes(token);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new Error('Request body too large');
  if (!text.trim()) return {};
  return JSON.parse(text) as Record<string, unknown>;
}

function base64FromArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ------------------------------------------------------------------ */
/* Image generation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Normalise whatever Workers AI hands back into base64.
 *
 * FLUX models on the binding return `{ image: "<base64>" }`; some paths return
 * a raw ArrayBuffer or a ReadableStream, so all three are handled.
 */
async function toBase64(result: unknown): Promise<string | null> {
  if (!result) return null;
  if (typeof result === 'string') return result;
  if (result instanceof ArrayBuffer) return base64FromArrayBuffer(result);
  if (typeof ReadableStream !== 'undefined' && result instanceof ReadableStream) {
    const buffer = await new Response(result).arrayBuffer();
    return base64FromArrayBuffer(buffer);
  }
  if (typeof result === 'object') {
    const record = result as Record<string, unknown>;
    if (typeof record.image === 'string') return record.image;
    if (record.image instanceof ArrayBuffer) return base64FromArrayBuffer(record.image);
    if (typeof record.result === 'object' && record.result) return toBase64(record.result);
  }
  return null;
}

/**
 * REST fallback. FLUX.2 takes multipart form data over the REST API, which is
 * the path `cloudflare-image-mcp` uses. Only reachable when CF_ACCOUNT_ID and
 * CF_AI_TOKEN are configured.
 */
async function runViaRest(env: Env, model: string, input: Record<string, unknown>): Promise<string | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_AI_TOKEN) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/${model}`;
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_AI_TOKEN}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Workers AI REST error ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { result?: unknown };
    return toBase64(payload.result ?? payload);
  }
  return base64FromArrayBuffer(await response.arrayBuffer());
}

async function handleImages(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invalid JSON', 400, headers);
  }

  const prompt = String(body.prompt || '').trim().slice(0, MAX_PROMPT);
  if (!prompt) return fail('prompt is required', 400, headers);

  const requested = String(body.model || DEFAULT_MODEL);
  const model = IMAGE_MODELS.has(requested) ? requested : DEFAULT_MODEL;

  // OpenAI sends "1024x1024"; Workers AI wants width and height.
  const size = String(body.size || '1024x1024');
  const [rawWidth, rawHeight] = size.split('x').map(value => Number.parseInt(value, 10));
  const width = Number.isFinite(rawWidth) ? Math.min(1536, Math.max(256, rawWidth)) : 1024;
  const height = Number.isFinite(rawHeight) ? Math.min(1536, Math.max(256, rawHeight)) : 1024;

  const steps = Number.isFinite(Number(body.steps)) ? Math.min(50, Math.max(1, Number(body.steps))) : 4;
  const seed = Number.isFinite(Number(body.seed)) ? Math.abs(Number(body.seed)) % 4_294_967_295 : undefined;

  const input: Record<string, unknown> = { prompt, width, height, steps };
  if (seed !== undefined) input.seed = seed;

  let base64: string | null = null;
  let via = 'binding';
  try {
    base64 = await toBase64(await env.AI.run(model, input));
  } catch (bindingError) {
    try {
      base64 = await runViaRest(env, model, input);
      via = 'rest';
    } catch (restError) {
      const detail = restError instanceof Error ? restError.message
        : bindingError instanceof Error ? bindingError.message
        : 'Image generation failed';
      return fail(detail, 502, headers);
    }
  }

  if (!base64) return fail('Model returned no image', 502, headers);

  return json(
    {
      created: Math.floor(Date.now() / 1000),
      model,
      via,
      data: [{ b64_json: base64, revised_prompt: prompt }],
    },
    200,
    { ...headers, 'Cache-Control': 'public, max-age=86400' },
  );
}

/* ------------------------------------------------------------------ */
/* Jev decisions                                                       */
/* ------------------------------------------------------------------ */

/**
 * Thin, validating proxy to the Jev AI decision endpoint.
 *
 * The browser never sees JEV_API_KEY. The body is size-capped and shape-checked
 * so this cannot be used as a generic open relay.
 */
async function handleDecisions(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  if (!env.JEV_API_KEY) {
    return fail('JEV_API_KEY is not configured on this Worker', 501, headers);
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Invalid JSON', 400, headers);
  }

  const questions = body.questions;
  if (!body.state || typeof questions !== 'object' || questions === null) {
    return fail('state and questions are required', 400, headers);
  }
  const questionCount = Object.keys(questions as Record<string, unknown>).length;
  if (questionCount < 1 || questionCount > 64) {
    return fail('questions must contain between 1 and 64 entries', 400, headers);
  }

  const base = (env.JEV_BASE_URL || 'https://jev-ai.pro/api').replace(/\/$/, '');
  const response = await fetch(`${base}/v1/systemone`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.JEV_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: typeof body.model === 'string' ? body.model : 'jev-latest',
      state: body.state,
      questions,
    }),
  });

  const text = await response.text();
  // Pass the status through so the client can honour 429 and Retry-After.
  const passthrough: Record<string, string> = { ...headers, 'Content-Type': 'application/json' };
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) passthrough['Retry-After'] = retryAfter;
  return new Response(text || '{}', { status: response.status, headers: passthrough });
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(env, request);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    if (path === '/health' || path === '/') {
      return json(
        {
          status: 'ok',
          service: 'fora-edge',
          models: IMAGE_MODELS.size,
          imageModels: [...IMAGE_MODELS],
          defaultModel: DEFAULT_MODEL,
          decisions: Boolean(env.JEV_API_KEY),
          authRequired: Boolean((env.API_KEYS || '').trim()),
          deployedAt: env.DEPLOYED_AT || 'unknown',
          commit: env.COMMIT_SHA || 'unknown',
        },
        200,
        headers,
      );
    }

    if (!authorised(request, env)) return fail('Missing or invalid bearer token', 401, headers);

    if (request.method !== 'POST') return fail('Method not allowed', 405, headers);

    try {
      if (path === '/v1/images/generations') return await handleImages(request, env, headers);
      if (path === '/v1/decisions') return await handleDecisions(request, env, headers);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Unhandled error', 500, headers);
    }

    return fail(`Unknown route ${path}`, 404, headers);
  },
};
