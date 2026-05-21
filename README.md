# OmniTrip

An AI-powered travel companion that plans, books, and guides you through every trip — with a persistent personality-adaptive Buddy that knows your travel style.

---

## Tech stack

**Frontend**
- React 19 + Vite (web PWA), Expo / React Native (iOS + Android)
- Turborepo monorepo — shared business logic in `packages/shared`, zero duplication
- Zustand stores, React Router 7, TailwindCSS 4, Recharts, Leaflet

**Backend**
- Supabase: PostgreSQL + Row-Level Security + Auth
- 8 Deno edge functions — LLM proxy, RAG pipeline, Stripe webhooks, booking, recommendations
- Stripe-integrated payments with HMAC-verified webhook processing
- Amadeus API for live flight and hotel pricing

**AI**
- OpenAI GPT-5.4 — structured JSON itinerary generation
- Anthropic Claude (claude-sonnet-4-6) — conversational Buddy chat, POI narrations, voice commands
- pgvector RAG pipeline — `text-embedding-3-small` embeddings, IVFFlat cosine index, top-k retrieval
- Tool calling (OpenAI + Anthropic) — 15 native tools replace fragile regex-tag action dispatch
- GraphQL layer via pg_graphql — selective field fetching for read-heavy screens

**Observability**
- Core Web Vitals (CLS, FCP, INP, LCP, TTFB) reported to Supabase via `report-metric` edge function
- Per-user LLM token usage tracked in `llm_usage` with sliding-window rate limiting
- Lighthouse CI configured (`lighthouserc.json`) — target ≥90/100 performance

---

## AI features

### Multi-provider LLM abstraction

A unified `LLMProvider` interface (`packages/shared/src/services/llm.ts`) routes all AI calls through the server-side `llm-proxy` edge function. OpenAI and Anthropic share the same interface — provider selection is a config decision, not a code change.

```
openAIProvider  → gpt-5.4          → structured JSON itineraries
anthropicProvider → claude-sonnet-4-6 → Buddy chat, voice, narrations
```

### RAG-based trip planning

Trip suggestions are powered by a retrieval-augmented generation pipeline:

1. 20+ trip templates are embedded with `text-embedding-3-small` and stored in a pgvector table
2. The user's query is embedded at query time
3. `match_embeddings()` RPC runs cosine similarity search (IVFFlat index, lists=100)
4. Top-k matched templates are injected into the planning prompt as context

The keyword-matching fallback ensures planning works before embeddings are seeded.

### Native tool calling

All Buddy action dispatch uses OpenAI / Anthropic native tool calling rather than regex-parsed `[ACTION:foo]` tags in the LLM output. 15 tools are defined in `packages/shared/src/services/buddyTools.ts` covering navigation, booking, discovery, and route plotting. A regex fallback in `extractAction()` maintains backward compatibility.

### GraphQL layer

`pg_graphql` exposes the Postgres schema as a typed GraphQL API at `/graphql/v1`. `useAllTrips()` fetches via GraphQL with selective field projection; the authenticated `GraphQLClient` (in `apps/web/src/services/graphql.ts`) attaches the user's session JWT.

---

## Security

| Concern | Approach |
|---|---|
| LLM API keys | Server-side only via `supabase secrets set` — never in `VITE_*` or `EXPO_PUBLIC_*` |
| Authentication | Supabase Auth (JWT) validated in every edge function before processing |
| Database access | Row-Level Security on every user table — `user_id = auth.uid()` |
| Rate limiting | Sliding-window token counter (200k/hour/user) in the `llm-proxy` |
| Payments | Stripe webhook HMAC verification before any state change |
| HTTP headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` via Vercel |
| Assets | `Cache-Control: public, max-age=31536000, immutable` for content-hashed bundles |

---

## Performance

Static JS/CSS bundles are content-hashed by Vite and served with year-long immutable cache headers. Heavy libraries are lazy-loaded:

- Spline 3D renderer — dynamic import, not in initial bundle
- Leaflet maps — dynamic import, loads only when a map is rendered
- Supabase preconnect added at boot to eliminate DNS/TLS cold-start on first API call

Core Web Vitals are measured in production via the `web-vitals` library and stored in the `metrics` table for trend monitoring.

To run Lighthouse locally:
```bash
npm run build --workspace=apps/web
npx lhci autorun
```

---

## Local setup

**Prerequisites:** Node 20+, npm 10+

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_FOURSQUARE_API_KEY

# 3. Set server-side secrets (requires Supabase CLI)
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 4. Apply database migrations
supabase db push

# 5. Deploy edge functions
supabase functions deploy llm-proxy
supabase functions deploy embed-content
supabase functions deploy rag-retrieve
supabase functions deploy report-metric

# 6. Seed trip template embeddings
npx tsx packages/shared/src/scripts/seed-embeddings.ts

# 7. Start dev servers
npm run web      # http://localhost:5173
npm run mobile   # Expo dev client
```

---

## Testing

```bash
# Unit + integration tests (Vitest)
npm test --workspace=apps/web

# Type check all packages
npx tsc -p packages/shared/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
npx tsc -p apps/mobile/tsconfig.json --noEmit

# Lighthouse performance audit
npm run build --workspace=apps/web && npx lhci autorun
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep-dive on the LLM provider abstraction, RAG pipeline, tool-calling lifecycle, and security model.
