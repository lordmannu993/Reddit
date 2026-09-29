# Fora — Infinite Community Feed

Fora is a polished Reddit-style community platform with an effectively infinite, community-aware content feed. It is built as a responsive React + TypeScript application and ships with a deterministic local content provider, rich community profiles, realistic seeded conversations, and a clean provider boundary for a production AI backend.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Production build

```bash
npm run build
npm run preview
```

## Product areas

- Personalized infinite home feed with Best, Hot, New, Top, and Rising sorting
- 19 distinct community profiles spanning technology, hobbies, finance, relationships, science, travel, food, sports, and more
- Rich post pages with nested comment conversations and inline replies
- Community pages with unique identities, rules, tone, culture, moderation standards, and posting conventions
- Community discovery, search, saved posts, user profile, notifications, post creation, and settings
- Functional votes, saves, subscriptions, comments, replies, theme switching, and responsive mobile navigation
- Skeleton loading, empty states, subtle motion, and light/dark themes

## Content architecture

`src/services/contentEngine.ts` defines the AI provider boundary, moderation layer, content cache, and local community-aware generation provider. `getGenerationContext()` turns each community profile into structured generation context including voice, vocabulary, audience, topics, formats, comment culture, norms, and content to avoid.

The mock provider intentionally serves authored, community-specific content rather than generic filler. A server-backed provider can implement `AIContentProvider` without changing feed or UI components.
