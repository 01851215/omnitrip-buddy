# OmniTrip — Architecture Reference

This document describes the key technical systems for engineers joining the project or doing a security / architecture review.

---

## Monorepo layout

```
omnitrip/
├── apps/
│   ├── web/          React 19 + Vite PWA (primary product surface)
│   └── mobile/       Expo / React Native (iOS + Android)
├── packages/
│   └── shared/       Business logic shared across platforms
│       ├── services/ LLM providers, RAG, Supabase client, trip AI
│       ├── hooks/    Data-fetching hooks (React)
│       ├── stores/   Zustand global state
│       └── platform/ Adapter interfaces (speech, TTS, location, openUrl)
└── apps/web/
    └── supabase/
        ├── functions/  Deno edge functions (server-side API)
        └── migrations/ Postgres schema history
```

Turborepo orchestrates builds; `packages/shared` is consumed by both apps with zero duplication of business logic.

---

## LLM Provider Abstraction

**File:** `packages/shared/src/services/llm.ts`

All AI calls flow through a single `LLMProvider` interface:

```
LLMProvider
  .chat(messages, opts)                     → string | null
  .chatWithTools(messages, tools, opts)     → LLMResponse { text, toolCalls? }
```

Two concrete providers are created at startup:

| Provider        | Model      | Used for                                        |
|-----------------|------------|-------------------------------------------------|
| `openAIProvider`     | gpt-5.4    | Structured JSON itinerary generation            |
| `anthropicProvider`  | claude-sonnet-4-6 | Buddy conversational chat, POI narrations |

Both route through the **`llm-proxy` edge function** — API keys never leave the server. The proxy normalises Anthropic's response format to match OpenAI's `choices[0].message` shape so all client code is provider-agnostic.

### Tool calling

`chatWithTools()` sends a `tools` array (JSON Schema definitions) to the model. The proxy converts our canonical `ToolDefinition` format to each provider's native format and normalises `tool_use` blocks (Anthropic) back to `tool_calls` (OpenAI) in the response.

**File:** `packages/shared/src/services/buddyTools.ts` — 15 tool definitions:
- Navigation: `go_home`, `open_profile`, `show_journeys`, `show_calendar`, `check_budget`
- Booking: `plan_trip`, `find_hotels`, `find_flights`, `find_trains`, `find_restaurants`, `find_activities`
- Discovery: `nearby_food`, `nearby_things`, `hidden_gems`
- Directions: `navigate_to` (takes GPS `waypoints[]`)

`extractAction(response, toolCalls?)` in `buddyPersonality.ts` prefers structured tool calls; falls back to legacy `[ACTION:]` / `[ROUTE:]` regex tags for backward compatibility.

---

## RAG Pipeline (Retrieval-Augmented Generation)

```
User query
    │
    ▼
embed-content (edge fn)
  OpenAI text-embedding-3-small → vector(1536)
    │
    ▼
embeddings table (pgvector)
  IVFFlat cosine index (lists=100)
    │
    ▼
match_embeddings() RPC
  1 - (e.embedding <=> query_embedding) AS similarity
  ORDER BY similarity DESC LIMIT k
    │
    ▼
Top-k results → injected into LLM system prompt
    │
    ▼
generateTripSuggestions() → personalised itinerary
```

**Key files:**
- `apps/web/supabase/migrations/0002_embeddings_table.sql` — schema + IVFFlat index
- `apps/web/supabase/migrations/0004_embeddings_search_fn.sql` — `match_embeddings()` RPC
- `apps/web/supabase/functions/embed-content/index.ts` — embedding upsert function
- `apps/web/supabase/functions/rag-retrieve/index.ts` — retrieval function
- `packages/shared/src/services/tripAI.ts` — `ragRetrieveTemplates()` integration

Embeddings are split by scope:
- `user_id = null` → global (trip templates, shared knowledge)
- `user_id = <id>` → per-user (past trip reflections, journal entries)

RLS ensures users can only retrieve their own embeddings or global ones.

---

## Security Model

### API key handling
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are **server-side only** — set via `supabase secrets set`, never in `VITE_*` or `EXPO_PUBLIC_*` env vars.
- All AI calls route through `llm-proxy`, which validates the user's JWT before forwarding.

### llm-proxy request lifecycle
```
Client (JWT)  →  llm-proxy edge fn
                    ├── auth.getUser(token)         validates JWT
                    ├── llm_usage sliding window     enforces 200k tokens/hour/user
                    ├── fetch OpenAI / Anthropic     with server-side API key
                    └── llm_usage.insert()           records usage for audit
```

### Row-Level Security (RLS)
Every table with user data has RLS enabled:
- `trips`, `expenses`, `calendar_events`, etc. — `user_id = auth.uid()`
- `embeddings` — authenticated users see global + own; service role writes
- `llm_usage` — users see own usage; service role writes
- `metrics` — users see own metrics; service role writes

### Stripe webhooks
Payment events are verified with `stripe.webhooks.constructEvent()` (HMAC-SHA256) before any booking state change is applied.

---

## GraphQL Layer (pg_graphql)

Supabase exposes a full GraphQL API at `/graphql/v1` via the `pg_graphql` extension. The schema is auto-generated from the Postgres schema and respects RLS.

**File:** `apps/web/src/services/graphql.ts` — `getGraphQLClient()` factory that attaches the user's JWT and the Supabase anon key.

**Migrated hook:** `apps/web/src/hooks/useTrips.ts` — `useAllTrips()` fetches via GraphQL with selective field projection. All other trip hooks remain on the Supabase JS client to limit migration scope. New features should prefer GraphQL for read-heavy queries.

---

## Performance

### Caching strategy
- Vite content-hashes all JS/CSS bundles → `Cache-Control: public, max-age=31536000, immutable` in `vercel.json`
- Heavy libraries (Spline 3D, Leaflet maps) are dynamic-imported — they don't block initial render
- Supabase preconnect added at boot to eliminate DNS + TLS cold-start on first API call

### Core Web Vitals monitoring
`web-vitals` library measures CLS, FCP, INP, LCP, TTFB in real users' browsers and reports to the `report-metric` edge function, which stores results in the `metrics` table. Use `select name, avg(value), avg(rating) from metrics group by name` in Supabase Studio to monitor trends.

### Lighthouse CI
`lighthouserc.json` at repo root — run `npx lhci autorun` against the preview build to get a scored report. Target: ≥90/100 performance, ≥90/100 accessibility.

---

## Edge Functions (Deno)

All edge functions live in `apps/web/supabase/functions/`. Deployed with `supabase functions deploy <name>`.

| Function         | Purpose                                               |
|------------------|-------------------------------------------------------|
| `llm-proxy`      | Server-side LLM API gateway + rate limiting           |
| `embed-content`  | Generate and upsert OpenAI embeddings                 |
| `rag-retrieve`   | Cosine similarity search over embeddings              |
| `report-metric`  | Receive and store Core Web Vitals from the browser    |
| `stripe-webhook` | HMAC-verified Stripe event handler                    |
| `book-deal`      | Initiate Stripe Checkout session for bookings         |
| `ai-planner`     | Trip itinerary generation (AI-powered)                |
| `recommend-deals`| Personalised deal recommendations                     |

---

## Data flow: Buddy voice command

```
User speaks
    │ Web Speech API / Expo Speech
    ▼
startVoiceSession() / HandsFreeToggle
  transcript → callClaudeWithTools(systemPrompt, transcript, buddyTools)
    │
    ▼
anthropicProvider.chatWithTools()
  → callProxy("anthropic", model, messages, tools)
      → llm-proxy edge fn → Anthropic API
    │
    ▼
LLMResponse { text, toolCalls? }
    │
    ▼
extractAction(text, toolCalls)
  ├── toolCalls present → action = toolCall.name / waypoints
  └── fallback → regex [ACTION:] / [ROUTE:] parser
    │
    ▼
speak(text)  +  navigate(route) / trigger action
```
