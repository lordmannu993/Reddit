/**
 * Optional model-backed generation.
 *
 * The simulation runs fully without this. When a user supplies their own API
 * key it is kept in their browser only, and the model receives the same
 * CultureProfile signal the local engine uses — never raw Reddit text — with
 * explicit instructions to write original content and never to impersonate
 * real Reddit posts or users.
 */

import type { Comment, CommunityProfile, CultureProfile, ModelSettings, Post } from '../types';
import { hashString } from './synthesis';

const SETTINGS_KEY = 'fora-model-settings';

export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-haiku-latest',
  custom: 'gpt-4o-mini',
};

export const defaultSettings: ModelSettings = { provider: 'none', apiKey: '', model: '', baseUrl: '' };

export function loadModelSettings(): ModelSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<ModelSettings>;
    return {
      provider: parsed.provider || 'none',
      apiKey: parsed.apiKey || '',
      model: parsed.model || '',
      baseUrl: parsed.baseUrl || '',
    };
  } catch {
    return defaultSettings;
  }
}

export function saveModelSettings(settings: ModelSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage disabled */
  }
}

export function modelIsConfigured(settings: ModelSettings) {
  return settings.provider !== 'none' && settings.apiKey.trim().length > 8;
}

/* ------------------------------------------------------------------ */
/* Prompting                                                           */
/* ------------------------------------------------------------------ */

function contextBrief(profile: CultureProfile) {
  return {
    community: profile.displayName,
    what_it_is: profile.title || profile.description,
    context_freshness: profile.source === 'live'
      ? `live sample of ${profile.sampleSize} posts from the last ${profile.windowHours}h`
      : `${profile.source} profile (not live)`,
    active_topics: profile.topics.slice(0, 8).map(topic => ({
      label: topic.label,
      terms: topic.terms,
      recurring_names: topic.entities,
      attention: Number(topic.heat.toFixed(2)),
      momentum: topic.momentum,
      flavour: topic.kind,
    })),
    recurring_names: profile.entities.slice(0, 14).map(entity => entity.term),
    recurring_phrases: profile.phrases.slice(0, 10).map(phrase => phrase.term),
    community_vocabulary: profile.slang.slice(0, 14),
    gaining_attention: profile.rising.slice(0, 8),
    common_flairs: profile.flairs.slice(0, 8).map(flair => flair.text),
    recurring_threads: profile.recurringThreads,
    writing_style: {
      humour: profile.tone.humor,
      formality: profile.tone.formality,
      question_rate: profile.tone.questionRate,
      lowercase_titles: profile.tone.lowercase,
      average_title_words: profile.tone.avgTitleWords,
      spoiler_culture: profile.tone.spoilerRate,
    },
    format_mix: profile.formatMix,
  };
}

const SYSTEM_PROMPT = `You generate ORIGINAL simulated community content for a Reddit-style app called Fora.

You are given only statistical signal about a real subreddit: topic clusters, recurring names, vocabulary, tone measurements and format ratios. You never receive real post text, and you must never reproduce, paraphrase or reconstruct a specific real post, comment or user.

Write brand-new posts that would plausibly belong in that community right now.

Hard rules:
- Original content only. Use the signal as cultural context, not as material to copy.
- Never claim the content is from Reddit, and never impersonate a specific real person or real account.
- Usernames must be clearly invented.
- Vary the batch: mix theories, jokes, questions, meme concepts, discussions, hot takes, showcases, meta threads, polls. Never repeat a format twice in a row.
- Reference ongoing community topics, and introduce new but plausible discussions connected to them.
- Match the measured tone: if humour is high, be funny and lowercase; if formality is high, write considered prose.
- No slurs, harassment, sexual content involving minors, real-person defamation, medical or legal certainty, or instructions for harm.
- Image-style posts describe a visual concept in words (no fabricated photo claims, no URLs).

Return STRICT JSON only, no markdown fences, matching:
{"posts":[{"title":string,"body":string,"flair":string,"type":"text"|"image"|"poll","topic":string,"archetype":string,"concept":{"format":string,"setup":string,"punchline":string}|null,"pollOptions":[{"label":string}]|null,"comments":[{"author":string,"body":string,"replies":[{"author":string,"body":string}]}]}]}`;

interface ModelPost {
  title?: string;
  body?: string;
  flair?: string;
  type?: string;
  topic?: string;
  archetype?: string;
  concept?: { format?: string; setup?: string; punchline?: string } | null;
  pollOptions?: { label?: string }[] | null;
  comments?: { author?: string; body?: string; replies?: { author?: string; body?: string }[] }[];
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Model did not return JSON');
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

async function callOpenAiCompatible(settings: ModelSettings, prompt: string, signal?: AbortSignal): Promise<string> {
  const base = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODELS.openai,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 1,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status})`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callGemini(settings: ModelSettings, prompt: string, signal?: AbortSignal): Promise<string> {
  const model = settings.model || DEFAULT_MODELS.gemini;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1, responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status})`);
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') ?? '';
}

async function callAnthropic(settings: ModelSettings, prompt: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODELS.anthropic,
      max_tokens: 3000,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status})`);
  const data = await response.json();
  return (data?.content || []).map((part: { text?: string }) => part.text || '').join('');
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface ModelBatchRequest {
  settings: ModelSettings;
  profile: CultureProfile;
  community: CommunityProfile;
  batch: number;
  count: number;
  avoidTitles: string[];
  signal?: AbortSignal;
}

function initials(name: string) {
  const parts = name.split(/[_\-\s]/).filter(Boolean);
  return ((parts[0]?.[0] || 'u') + (parts[1]?.[0] || parts[0]?.[1] || 'x')).toUpperCase();
}

export async function generateWithModel(request: ModelBatchRequest): Promise<Post[]> {
  const { settings, profile, community, batch, count, avoidTitles } = request;
  const brief = contextBrief(profile);
  const drift = batch === 0
    ? 'This is the top of the feed: lead with what the community is most focused on.'
    : `This is scroll depth ${batch}. Reach further into secondary topics, blend two topics together in at least one post, and include at least one post that introduces a new but plausible discussion connected to the existing ones.`;

  const prompt = [
    `Community context (derived signal only):\n${JSON.stringify(brief, null, 2)}`,
    `Write ${count} new posts.`,
    drift,
    avoidTitles.length ? `Do not repeat or closely echo these already-generated titles:\n- ${avoidTitles.slice(-30).join('\n- ')}` : '',
    'Give each post 2 to 5 comments with distinct voices, and let one comment be a reply from the original poster where it fits.',
  ].filter(Boolean).join('\n\n');

  let raw: string;
  if (settings.provider === 'gemini') raw = await callGemini(settings, prompt, request.signal);
  else if (settings.provider === 'anthropic') raw = await callAnthropic(settings, prompt, request.signal);
  else raw = await callOpenAiCompatible(settings, prompt, request.signal);

  const parsed = extractJson(raw) as { posts?: ModelPost[] };
  const list = Array.isArray(parsed?.posts) ? parsed.posts : [];
  if (!list.length) throw new Error('Model returned no posts');

  return list.slice(0, count).map((item, index) => {
    const title = (item.title || '').trim().slice(0, 300);
    const seed = hashString(`${community.id}-${batch}-${index}-${title}`);
    const rand = (min: number, max: number) => min + ((seed >> (index + 3)) % 1000) / 1000 * (max - min);
    const ageMinutes = Math.round(rand(12, 260) + batch * 180);
    const score = Math.max(4, Math.round(rand(60, 5200)));
    const commentSeeds = Array.isArray(item.comments) ? item.comments.slice(0, 6) : [];
    const commentTree: Comment[] = commentSeeds.map((comment, commentIndex) => {
      const author = (comment.author || 'anon_reader').replace(/^u\//, '').slice(0, 24);
      return {
        id: `m-${index}-${commentIndex}`,
        author,
        avatar: initials(author),
        body: (comment.body || '').slice(0, 900),
        score: Math.max(1, Math.round(score / (2 + commentIndex * 1.7))),
        time: commentIndex === 0 ? `${30 + (seed % 28)}m` : `${1 + commentIndex}h`,
        replies: (comment.replies || []).slice(0, 2).map((reply, replyIndex) => {
          const replyAuthor = (reply.author || 'anon_reader').replace(/^u\//, '').slice(0, 24);
          return {
            id: `m-${index}-${commentIndex}-${replyIndex}`,
            author: replyAuthor,
            avatar: initials(replyAuthor),
            body: (reply.body || '').slice(0, 700),
            score: Math.max(1, Math.round(score / (6 + replyIndex * 3))),
            time: `${1 + replyIndex}h`,
            replies: [],
          };
        }),
      };
    });

    const type: Post['type'] = item.type === 'image' ? 'image' : item.type === 'poll' ? 'poll' : 'text';
    const author = (item.comments?.[0]?.author ? `thread_op_${index}` : `sim_author_${index}`);
    const opName = (item as { author?: string }).author?.replace(/^u\//, '') || author;

    return {
      id: `model-${community.id}-${batch}-${index}-${seed.toString(36)}`,
      communityId: community.id,
      author: opName,
      avatar: initials(opName),
      title,
      body: (item.body || '').slice(0, 2600) || undefined,
      flair: (item.flair || item.archetype || 'Discussion').slice(0, 24),
      flairColor: community.color,
      score,
      comments: Math.max(commentTree.length, Math.round(score * 0.08)),
      time: ageMinutes < 60 ? `${ageMinutes}m` : `${Math.round(ageMinutes / 60)}h`,
      ageMinutes,
      type,
      concept: item.concept && item.concept.setup
        ? {
          format: item.concept.format || 'Described image',
          setup: item.concept.setup,
          punchline: item.concept.punchline || '',
          altText: `${item.concept.format || 'Concept'}: ${item.concept.setup}`,
        }
        : undefined,
      pollOptions: Array.isArray(item.pollOptions) && item.pollOptions.length
        ? item.pollOptions.slice(0, 4).map((option, optionIndex) => ({
          label: (option.label || `Option ${optionIndex + 1}`).slice(0, 80),
          votes: Math.max(10, Math.round(score * (0.4 - optionIndex * 0.08))),
        }))
        : undefined,
      readTime: (item.body || '').length > 600 ? `${Math.max(2, Math.round((item.body || '').length / 900))} min read` : undefined,
      trend: ageMinutes < 200 && score > 900 ? 'rising' : score > 3000 ? 'hot' : undefined,
      commentTree,
      generated: true,
      generator: 'model',
      archetype: item.archetype || 'Model',
      topicLabel: item.topic || profile.topics[0]?.label,
      contextSource: profile.source,
      batch,
    } satisfies Post;
  }).filter(post => post.title.length > 3);
}
