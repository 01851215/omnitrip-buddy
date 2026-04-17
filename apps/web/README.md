# OmniTrip

AI-powered travel companion app. Plan trips, explore destinations with a day-by-day itinerary, track budgets, and chat with OmniBuddy — your personal travel AI.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (`@theme` in CSS, no config file) |
| State | Zustand (`buddyStore`, `locationStore`, `tripStore`, `planningStore`, `profileStore`, etc.) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| AI Chat | OpenAI API — primary `gpt-5.4-mini` with fallback chain (`gpt-5.4`, `gpt-4o`, …) + conversation history + demo fallback |
| Routing | OSRM (free, road-following geometry) with mode-specific duration calculations |
| AI Planning | Same stack; query-aware fallbacks when models fail |
| Booking | Amadeus API (real prices) + Stripe Checkout (payments) + affiliate links |
| Maps | Leaflet.js |
| Charts | Custom SVG (VibeChart, CategoryBreakdown) |
| Voice | Web Speech API (STT) + ElevenLabs / browser TTS |
| POI | Foursquare Places API (with demo fallback) |

## Documentation

- **Product workflow (journeys, calendar, booking, profile):** [`docs/workflow/`](docs/workflow/) — narrative + link to the [OmniTrip App Workflow FigJam](https://www.figma.com/board/N4izVzULfnLX8BLHiKNy98/OmniTrip-App-Workflow?node-id=0-1).

## Project Structure

```
src/
├── components/
│   ├── auth/           # AuthSheet, AuthGuard, AuthProvider
│   ├── Buddy/          # BuddyContainer (floating button), BuddyOverlay
│   ├── BuddyPanel/     # Chat panel (ChatFeed, POIFeed, QuickActions, PanelInput)
│   ├── BottomNav/      # 5-tab bottom navigation
│   ├── calendar/       # CalendarSyncSheet (ICS, deep links, subscription URL)
│   ├── itinerary/      # ActivityCard, DaySection, AddActivitySheet
│   ├── insights/       # VibeChart (radial SVG), CategoryBreakdown (bar chart)
│   ├── profile/        # TagInput, SliderField
│   └── ui/             # Button, Card, shared components
├── screens/
│   ├── OnboardingScreen.tsx   # Splash + auth entry
│   ├── HomeScreen.tsx         # Dashboard: active trip, destinations, budget, calendar widgets
│   ├── PlanningScreen.tsx     # AI trip planner with templates + Claude suggestions
│   ├── DestinationDetailScreen.tsx  # Hero + map + day-by-day itinerary
│   ├── CalendarScreen.tsx     # Timeline + month grid with conflict detection
│   ├── BudgetScreen.tsx       # Spend charts, category breakdown, quick log
│   ├── FootprintsScreen.tsx   # Past trips, journal, behavioral insights
│   └── ProfileScreen.tsx      # Editable profile, travel prefs, buddy settings
├── hooks/              # useAuth, useActiveTrip, useExpenses, useItinerary, useProfile, etc.
├── services/           # supabase, chatgpt, tripAI, travelInsights, calendarSync, speech, tts, location, poi, proactiveAlerts
├── stores/             # buddyStore, locationStore, tripStore, planningStore, profileStore, user, voice, buddyPanel
├── data/               # templates.ts (curated destination templates)
├── layouts/            # AppLayout (main shell with nav + buddy + alerts)
├── utils/              # mapRow.ts (snake_case <-> camelCase)
├── types/              # TypeScript interfaces (Trip, Expense, JournalEntry, etc.) + Supabase row types
└── db/                 # Legacy Dexie (deprecated, replaced by Supabase)
```

## Routes

| Path | Screen | Description |
|------|--------|-------------|
| `/` | OnboardingScreen | Splash + login/signup |
| `/reset-password` | ResetPasswordScreen | Set new password after recovery email (public) |
| `/auth/calendar/callback` | OAuthCallbackScreen | Reserved for calendar OAuth redirects (public) |
| `/home` | HomeScreen | Active trip dashboard |
| `/plan` | PlanningScreen | AI trip planning studio |
| `/destination/:id` | DestinationDetailScreen | Itinerary + map for a destination |
| `/calendar` | CalendarScreen | Timeline & month views + Sync sheet |
| `/budget` | BudgetScreen | Expense tracking & charts |
| `/footprints` | FootprintsScreen | Past journeys & reflections |
| `/profile` | ProfileScreen | User settings & preferences (per-section Save) |

## Setup

```bash
npm install
cp .env.example .env   # Add your keys (see below)
npm run dev             # Runs on http://localhost:5173
```

### Environment Variables

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_OPENAI_API_KEY=<your-openai-api-key>
VITE_OPENAI_MODEL=gpt-5.4       # optional, defaults to gpt-5.4
```

### Booking Engine APIs (Supabase Edge Function secrets)

These are set as Supabase Edge Function secrets, not frontend env vars:

| Variable | Where to get it |
|----------|----------------|
| `AMADEUS_API_KEY` | [developers.amadeus.com](https://developers.amadeus.com) — create a Self-Service app (free test tier: 2,000 calls/month) |
| `AMADEUS_API_SECRET` | Same as above |
| `STRIPE_SECRET_KEY` | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Add endpoint pointing to your `stripe-webhook` Edge Function URL |
| `KIWI_API_KEY` | *(optional)* [tequila.kiwi.com](https://tequila.kiwi.com) for supplementary flight/train data |

Set them via: `supabase secrets set AMADEUS_API_KEY=... AMADEUS_API_SECRET=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...`

### Test Account

```
Email:    testuser@gmail.com
Password: test1234
```

## Supabase

- **Project ID**: `tswpybvapytccwdixoxo`
- **Auth**: Email/password with auto-confirm trigger (bypasses email verification for demo)
- **RLS**: Row-level security per table (e.g. `profiles.id = auth.uid()`, `trips.user_id = auth.uid()`, etc.)
- **Tables**: profiles, trips, destinations, trip_days, activities, budgets, expenses, calendar_events, travel_profiles, journal_entries, dream_trips, trip_reflections, bookings, **calendar_subscriptions** (per-user ICS feed token)
- **Edge Functions**: `search-deals` (Amadeus proxy), `create-checkout` (Stripe session), `stripe-webhook` (payment confirmation), **`calendar-feed`** (signed URL → dynamic `.ics` for subscribed calendars)

### Data Mapping

DB uses `snake_case`, frontend uses `camelCase`. Conversion via `src/utils/mapRow.ts`.

---

## Development Log

### Session 1 — Initial Demo Build

Built the complete demo app with 8 screens, Buddy character animation (Spline 3D), voice pipeline, and seeded data using Dexie (local IndexedDB). All screens functional with mock data.

**Screens built:** Onboarding, Home, Planning, Calendar, Budget, Footprints, Profile + Bottom Nav with mic FAB + floating Buddy circle.

---

### Session 2 — User-Testing Upgrade (Phases 1-5)

User requested upgrading from demo-only to user-testing ready. Agreed on 5 phases.

#### Phase 1: Supabase + Auth + Data Migration (COMPLETE)

**What was done:**
- Created Supabase project via MCP, set up all tables with RLS policies
- Built auth flow: `AuthProvider`, `AuthGuard`, `AuthSheet` (slide-up login/signup)
- Migrated ALL data from Dexie to Supabase — created new hooks (`useActiveTrip`, `useExpenses`, `useBudget`, `useAllCalendarEvents`, etc.) that read/write to Supabase
- Created `seedSupabase.ts` to populate demo data for new users
- Added auto-confirm trigger on `auth.users` so demo users skip email verification

**Issues discussed & fixed:**
- Auth sheet didn't fit on screen → added `max-h-[85vh] overflow-y-auto`, reduced padding
- `test@omnitrip.demo` rejected by Supabase → switched to `testuser@gmail.com`
- Signup returned null user (email confirmation required) → created auto-confirm DB trigger + sign-in after sign-up flow
- `profiles.buddy_name` NOT NULL constraint failed on signup → added default `"OmniBuddy"` to upsert
- User asked about Google/Apple sign-in → decided not blocking, prioritize core experience first

#### Phase 2: Buddy Companion Panel (COMPLETE)

**What was done:**
- Removed mic FAB from bottom nav entirely
- Removed floating Buddy circle, replaced with fixed bottom-right Buddy Mode button
- Built full `BuddyPanel` — 85vh overlay with:
  - Chat feed (user green bubbles, buddy cream bubbles)
  - POI cards (horizontal scroll from location store)
  - Quick actions ("Food nearby", "Things to do", "Hidden gems", "Check budget", "What's next?")
  - Text input + mic toggle
- Integrated Claude API for Buddy responses with demo fallback
- Integrated Web Speech API (STT) + TTS for voice

**Issues discussed & fixed:**
- BuddyContainer not showing on `/home` → `useBuddyContext` returned `size === "hero"` causing early return; removed that check
- Bottom nav not visible on user's device → added `pb-[env(safe-area-inset-bottom)]`, `viewport-fit=cover` meta tag, shadow, increased height to 68px

#### Phase 3: Destination Details + Interactive Itinerary (COMPLETE)

**What was done:**
- Created `DestinationDetailScreen` at `/destination/:id` — hero image, stats bar, Leaflet map, day-by-day itinerary
- Built `DaySection` — collapsible day headers with energy emoji, completion count, buddy notes
- Built `ActivityCard` — tappable to cycle status (planned → completed → skipped), emoji by type, time/location/cost display
- Built `AddActivitySheet` — bottom sheet form to add new activities
- Created `useItinerary` hook with `useTripDays` and `useActivities` (fetch, toggle, add)
- Added destination cards to HomeScreen that navigate to detail view
- Seeded full itinerary data: 5 days of activities for Ubud (temples, food, nature, art)

**Questions discussed:**
- User confirmed tappable destinations with day-by-day view is the right approach
- Agreed on status cycling (tap to toggle) rather than swipe gestures

#### Phase 4: Planning Flow — AI Trip Generation (COMPLETE)

**What was done:**
- Created `src/data/templates.ts` — 5 curated destination templates (Bali, Japan, Portugal, Switzerland, Morocco) with full activity data
- Created `src/services/claude.ts` — shared AI service with `generateTripSuggestions()` and `generateBuddyResponse()`; attempts Claude API first, falls back to keyword-matching demo mode
- Rewrote `PlanningScreen.tsx`:
  - Natural language chat input + suggested prompts
  - "Popular Destinations" 2-column template grid with cover images, tags, duration, budget
  - AI-generated route suggestions with destination chips, budget, "Recommended" badge
  - "Add to Trip" creates real Supabase records (trip, destinations, trip_days, activities)
  - OmniBuddy insight card with "Why This Works" reasoning
  - Navigates to first destination detail after creation

**Questions discussed:**
- User wants custom planning for ANY destination (not just templates) — personalized to user preferences
- User wants to switch from Claude API to OpenAI/ChatGPT API

#### Phase 5: Full Profile Editor (COMPLETE)

**What was done:**
- Created `useProfile` hook — fetches both `profiles` and `travel_profiles`; writes use store-backed save helpers (see Session 8 for `.update` vs `.upsert` rules)
- Created `TagInput` component — pill display with add/remove
- Created `SliderField` component — labeled range slider with tick labels
- Rewrote `ProfileScreen.tsx` with 7 editable sections:
  - Header (Buddy avatar + name + email)
  - Basic Info (display name, age, bio — pencil toggle edit mode)
  - Travel Preferences (pace slider, budget style pills, cuisine tags, avoidance tags)
  - Notification Settings (quiet mode toggle, alert frequency)
  - Buddy Settings (buddy name, personality tone: warm/energetic/calm)
  - Location Services (permission status + enable button)
  - Account (email, log out, version)

---

### Session 3 — Advanced Features (COMPLETE)

User requested 4 upgrades after reviewing the app, plus additional planning enhancements:

1. **OpenAI API integration** — Switch from Claude to ChatGPT for all AI features; allow planning for ANY destination (not just templates), personalized to user's travel profile
2. **Smart Buddy proactivity** — Location-aware storytelling: trigger only on high-confidence POI match within 150-200m when user isn't moving fast; hands-free audio toggle that keeps screen off; subtle audio cues, not intrusive notifications
3. **Leaflet maps everywhere** — Interactive maps on Planning screen, Destination Detail, dedicated map views; show activity markers, POI pins, user location
4. **Actionable calendar** — Month grid with event indicators (dots/badges); tapping a day switches to that day's timeline view
5. **Planning constraints + LLM personalization** — Structured constraint fields (budget, dates, intensity) alongside free-text chat; personalized suggestions based on user's travel history

**What was done:**

1. **OpenAI ChatGPT API for open-ended planning** — Rewrote `src/services/claude.ts` to send trip queries to ChatGPT with a system prompt that generates full itineraries as JSON for ANY destination worldwide. Templates are passed as context/inspiration but AI can generate entirely custom routes. Added `generatedData` field to `RouteSuggestion` for custom routes. Demo fallback (template keyword matching) still works when API is unavailable.

2. **Smart Buddy proactivity wired up** — Connected `startAlertEngine()`/`stopAlertEngine()` in `AppLayout.tsx` via useEffect. The engine (already built in `proactiveAlerts.ts`) checks every 2 minutes for nearby high-confidence POIs within 200m when user is walking. In hands-free mode: audio cue + TTS narration only. In normal mode: visual toast + audio cue. Rate-limited to 3/hour with 10min minimum interval.

3. **Leaflet map on Planning results** — Added `LeafletMap` after route suggestion cards showing all destination markers across suggested routes. Centers on recommended route's first destination at zoom 4. Shows when results are visible and markers exist.

4. **Actionable calendar** — Changed default view to month grid (was timeline). Made day summary card fully clickable with highlighted background. Added prominent "View Day" pill button. MonthGrid already had event dots (teal/green) and count badges — now the full flow works: land on month → see dots → tap day → see timeline.

5. **Curated destination images** — Fixed broken AI-generated Unsplash URLs by creating a curated `DESTINATION_IMAGES` map with 30+ real Unsplash URLs keyed by destination name. `unsplashImage()` function does keyword matching with a generic travel fallback.

6. **Planning constraints UI** — Added collapsible "Refine your trip" section to PlanningScreen with:
   - **Budget**: 3 presets (Budget ~$50/day, Moderate ~$150/day, Luxury ~$300/day) + custom dollar input
   - **Dates**: Start and end date pickers
   - **Intensity**: Relaxed (2-3 activities), Balanced (3-4 activities), Packed (5-6 activities) — controls how packed each day's itinerary is and how many activity elements appear on the calendar
   - All fields are optional — users can fill any combination or just use free-text chat

7. **LLM personalization from user history** — Created `useUserHistory` hook that gathers past trips, activity completion patterns (favorite vs avoided types), budget accuracy, and travel profile from Supabase. `historyToPromptContext()` converts this into natural language fed into the ChatGPT system prompt, so suggestions are personalized to the user's travel style. A "Personalized from N past trips" badge appears when history data is available.

**Questions discussed:**
- User wants to use OpenAI ChatGPT API key instead of Claude API
- Buddy should be a true companion with location-aware storytelling, not just a chatbot
- Hands-free mode should keep screen off, audio only
- Smart proactive triggers: high-confidence POI + <200m + walking speed only
- Calendar should default to month grid, not timeline
- Maps should be on all relevant screens (Home, Destination Detail, Planning results)
- Planning constraints should be parallel to free-text (not sequential steps)
- LLM should use all available history: past trips, activity patterns, budget accuracy, travel profile
- Intensity = trip-specific (Relaxed/Balanced/Packed), not reusing profile pace slider

---

### Session 4 — Codebase Audit & Bug Fixes (COMPLETE)

Full codebase audit against 30+ reported concerns. Validated each against the actual source and categorized as blocking, should-fix, or nice-to-have.

**Findings & fixes:**

1. **App.tsx demo leftover** — Not an issue; `App.tsx` was already deleted. Entry is `main.tsx` with proper routing.
2. **Claude API removal** — `claude.ts` was already deleted. Removed the lingering `VITE_CLAUDE_API_KEY` env type declaration from `vite-env.d.ts`.
3. **ElevenLabs TTS** — Already fully implemented in `src/services/tts.ts` with graceful fallback to Web Speech API when no API key is set.
4. **Foursquare POI** — Already fully implemented in `src/services/poi.ts` with demo fallback returning hardcoded Bali POIs.
5. **Type safety gaps** — Concentrated in `mapRow.ts` (8 `any` mappers), `useItinerary.ts`, and `speech.ts`. Documented for future Supabase type generation.
6. **Trip lifecycle gap** — `completeTrip()` existed but was never called from UI. `updateTripStatus` was wired to HomeScreen's "Mark Journey Complete" button. Planning created trips as `active` directly.
7. **Currency conversion** — Was a no-op (`converted_amount = amount`). Implemented `src/utils/currency.ts` with static exchange rates for 10 currencies (USD, EUR, GBP, JPY, etc.) and wired it into BudgetScreen's Quick Log.
8. **Journal entry creation** — Was display-only. Added `createJournalEntry` to `useFootprints.ts` and a FAB + modal to FootprintsScreen.
9. **Spinner/EmptyState** — Components existed but were never imported. Wired `EmptyState` into HomeScreen (no active trip) and FootprintsScreen (no journal entries).
10. **Test infrastructure** — Set up Vitest + React Testing Library with a basic smoke test for the Button component.

---

### Session 5 — End-to-End Smoke Testing (COMPLETE)

Ran a full E2E smoke test across all screens using Playwright browser automation, verifying both UI interactions and Supabase data persistence after each mutation.

**Test results (all passed):**

| Test | What was verified | Supabase confirmed |
|------|-------------------|---------------------|
| Auth Signup | Created test account, seed data populated | profiles, trips, destinations, expenses, journal_entries, travel_profiles all created |
| Home — Complete Trip | Trip card displayed, "Mark Journey Complete" worked, empty state appeared | Trip status changed to `completed` |
| Planning — Create Trip | Submitted "3 days in Lisbon", received AI itinerary, clicked "Add This Trip" | New trip inserted with destination "Lisbon" |
| Calendar — Conflicts | Navigated to conflict date, tested Ignore button | Conflict dismissed in UI |
| Budget — Quick Log | Logged ¥2500 JPY ramen expense | Expense saved with `converted_amount` ~16.67 USD |
| Footprints — Journal | Created journal entry for "Lisbon, Portugal" | Entry persisted with correct location, text, date |
| Profile — Alert Frequency | Moved slider from Frequent (5) to Normal (3) | `notification_settings.alertFrequency` updated 5 → 3 |

**Bugs found and fixed during testing:**
- Missing RLS policy: `profiles` table lacked an INSERT policy for new users. Added `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid())`.
- `useActiveTrip` used `.single()` which threw 406 when no active trip existed. Changed to `.maybeSingle()`.

---

### Session 6 — Five Critical Issues (COMPLETE)

Addressed five user-reported issues across the app:

#### 1. Buddy Reflection buttons wired

The "Accept Suggestion" and "Tell me more" buttons on HomeScreen were placeholder-only with no handlers.

- **Accept Suggestion**: Dismisses the reflection card, sets Buddy to excited mood, speaks a confirmation via TTS.
- **Tell me more**: Opens the BuddyPanel chat and injects the reflection as context for a ChatGPT follow-up.
- **Dynamic content**: Reflection text is now generated via ChatGPT based on the user's actual budget data, with a template fallback.

#### 2. Connected Path — LLM vibe analysis, journey map, charts

Replaced the static placeholder "Connected Path" and hardcoded "Behavioural Insights" on the Journeys screen with three dynamic features:

- **Journey Map**: Interactive Leaflet map with dashed polylines connecting all visited destinations chronologically. Uses a new `useAllDestinations()` hook that joins `destinations` with `trips` by `user_id`. `LeafletMap` gained `polyline` and `fitBounds` props.
- **Travel Vibe Analysis**: New `src/services/travelInsights.ts` calls ChatGPT with the user's full travel history (via `useUserHistory`) and returns a structured personality analysis: archetype label (e.g. "The Mindful Wanderer"), trait scores, evolution narrative, and activity category breakdown. Falls back to a computed analysis from raw data when no API key is set.
- **Visualizations**: `VibeChart.tsx` renders a radial/spider SVG chart for 5 trait dimensions (Cultural Depth, Adventure, Food Explorer, Pace, Budget Savvy). `CategoryBreakdown.tsx` renders animated horizontal bar charts for activity type distribution. No external charting library needed.
- **Stats bar**: Now shows real destination count and country count instead of the `allTrips.length * 4` approximation.

#### 3. Intensity labels clarified

Updated `INTENSITY_OPTIONS` sub-text from "2-3 activities" / "3-4 activities" / "5-6 activities" to "2-3 per day" / "3-4 per day" / "5-6 per day" to match the actual AI prompt behavior.

#### 4. Profile persistence (superseded in later sessions)

Originally shipped with debounced auto-save; the app now uses **explicit Save per section** and a **`profileStore`** (see Session 8 below).

#### 5. Active journey now shows on Home

- `useActiveTrip` now queries for both `active` and `planning` status trips (preferring `active`), so planned trips appear on the Home dashboard instead of showing the "No active journey" empty state.
- A "Start Trip" button appears for planning-status trips, transitioning them to active.
- Added `visibilitychange` listener and `location.key` effect so the trip refreshes automatically when navigating back to Home.

---

### Session 7 — Profile Bug Fixes, Password Reset & GitHub Setup (COMPLETE)

Full audit of all reported profile issues. Root causes identified via live preview testing + Supabase DB inspection. All 6 bugs fixed plus GitHub repo created.

**Root causes found:**

| Bug | Root Cause |
|-----|------------|
| Profile pics not saving | Storage INSERT policy missing `WITH CHECK` — uploads to wrong paths were rejected |
| Basic info not saving | 2 of 4 users had **no `profiles` row** — `UPDATE` silently no-ops on missing rows |
| Travel preferences not saving | Seed data inserted `budget_style` as a complex object `{stays:0.4,...}` and `pace_preference: 0.35` — incompatible with slider UI; update failed silently |
| Alert frequency not saving | Same missing-row issue as basic info |
| Buddy settings not saving | Same missing-row issue — all `profiles` updates were lost |
| Password reset broken | App sent the reset email correctly but had no handler for the recovery redirect — token was lost when the app bounced to onboarding |

**Fixes shipped:**

1. **DB migration** — Created `handle_new_user()` trigger that auto-inserts a `profiles` row on every new signup. Backfilled the 2 users who had no row. Tightened the Storage INSERT policy to enforce `(storage.foldername(name))[1] = auth.uid()`.

2. **`updateProfile` → upsert** (`src/hooks/useProfile.ts`) — At the time, switched from `.update()` to `.upsert` for missing rows. **Later correction (Session 8):** `profiles` has NOT NULL columns (`username`, `email`, `buddy_name`) without defaults; PostgREST `INSERT … ON CONFLICT` still evaluates the INSERT row first, so partial upserts returned **400** (`username` null). **`saveProfile` now uses `.update().eq("id", userId)`** (row guaranteed by `handle_new_user`). **`travel_profiles`** continues to use **`.upsert({ onConflict: "user_id" })`**.

3. **Seed data fixed** (`src/services/seedSupabase.ts`) — `pace_preference: 0.35` → `3`, `budget_style: {object}` → `"moderate"`, `activity_preferences: {object}` → `["nature","culture","food","adventure"]`. Final profile write changed from `.update()` to `.upsert()`.

4. **Password reset flow** — `AuthProvider` now detects `#type=recovery` hash on mount, calls `supabase.auth.setSession()` with the token, then navigates to `/reset-password`. New `ResetPasswordScreen` shows a set-new-password form, calls `supabase.auth.updateUser({ password })`, and redirects to `/home` on success.

5. **Email service** — Configured Supabase custom SMTP to use **Resend** (`smtp.resend.com:465`). Auth emails (password reset, signup confirmation) now sent via Resend instead of Supabase's shared sender.

6. **GitHub repo** — Created public repo at `https://github.com/01851215/omnitrip-buddy` and pushed all sessions.

**Files changed:**
- `src/hooks/useProfile.ts` — upsert in `updateProfile`
- `src/services/seedSupabase.ts` — fixed seed data format + upsert profile
- `src/components/auth/AuthProvider.tsx` — recovery hash detection + navigate
- `src/screens/ResetPasswordScreen.tsx` — new screen (set new password form)
- `src/routes.tsx` — added public `/reset-password` route
- Supabase DB — `handle_new_user` trigger, backfill, storage policy
- Supabase Auth — custom SMTP via Resend

---

### Session 8 — Booking, calendar sync, profile store & fixes (COMPLETE)

**Booking & workflow**

- Hybrid **deals** surface (Amadeus-backed Edge function + Stripe for in-app purchases + affiliate redirects where applicable).
- Post-booking CTA flows toward **Calendar** (“Go on your calendar” style) so paid or confirmed items show on the embedded calendar.

**Planning & calendar data**

- **`planningStore`**: Planning UI state survives tab changes (e.g. Plan → Calendar → Plan).
- Itinerary **accept** / activity flows sync into **`calendar_events`** where implemented.

**Calendar → user’s own calendar**

- **CalendarSyncSheet**: Google/Outlook **deep links** (no user Google Cloud setup), **.ics** download, and **subscription URL** via **`calendar-feed`** + **`calendar_subscriptions`**.

**Profile**

- **`profileStore`** + **`useProfile`**: single source of truth; avoids form reset on navigation.
- **Save** per section: Basic Info, Travel, Notifications, Buddy.
- **`profiles`**: `.update()` only (avoid NOT NULL failure on upsert INSERT branch).
- **`travel_profiles`**: `.upsert` on `user_id`; no double-`JSON.stringify` on JSONB fields.
- **Location**: multi-tier geolocation + IP fallback; **in-app toggle** to turn sharing off (stop watch, clear coordinates).

**AI**

- Fallback model chain; **gpt-5.4-mini** in rotation; query-aware itinerary fallback for city queries when models fail.

**Docs**

- Workflow narrative and FigJam link live under **`docs/workflow/`**.

---

## Key Design Decisions

- **snake_case ↔ camelCase**: DB uses Postgres convention, frontend uses JS convention. `mapRow.ts` handles conversion.
- **Demo fallbacks**: All AI features (chat, planning, POI) have demo/offline fallback modes when API keys are missing or calls fail.
- **Safe area insets**: `viewport-fit=cover` + `env(safe-area-inset-bottom)` for mobile browser chrome.
- **Optimistic UI**: Profile and activity updates apply locally first, then persist to Supabase.
- **Auto-confirm auth**: Supabase trigger auto-confirms new users for demo/testing flow.
- **Profile saves**: Explicit **Save** per card; **`profileStore`** holds `profiles` + `travel_profiles` in memory across routes. **`profiles`** → `.update()`; **`travel_profiles`** → `.upsert`.
- **Custom SVG charts over libraries**: VibeChart and CategoryBreakdown are implemented as inline SVG/JSX to avoid adding Recharts or similar dependencies for a small number of visualizations.
- **LLM with computed fallbacks**: All AI-powered features (Buddy reflections, travel vibe analysis, trip planning) have client-side fallbacks that produce reasonable output from raw data when API keys are missing.

---

### Session 9 — In-App Booking with Affiliate Deep-Links (COMPLETE)

Users can now browse and book deals directly from their personalized itinerary on the Planning screen. After "Add to Trip" is clicked and the trip is created, a **Deals Panel** appears under the route card showing curated live offers across 5 categories. The "Add to Trip" button then becomes **"📅 Go to Calendar"** which navigates to the calendar showing all booked trip dates.

**What was done:**

1. **`src/services/affiliateLinks.ts`** — Deep-link URL builder for 14 providers across all categories:
   - Hotels: Booking.com, Airbnb, Hotels.com, Hostelworld
   - Flights: Skyscanner, Google Flights, BudgetAir, Opodo
   - Trains: Trainline, Rail Europe
   - Activities: Viator, GetYourGuide, Klook
   - Dining: OpenTable, TheFork, Tripadvisor
   - All links pre-fill destination name, checkin/checkout dates so users land on relevant search results

2. **`src/services/deals.ts`** — Curated deal generator that produces realistic deal cards (with deterministic price variants and destination-keyed images) for each destination in the route. Falls back gracefully when no live API data is available.

3. **`src/components/booking/DealCard.tsx`** — Individual deal card (240px wide, horizontal scroll):
   - Cover image, badge (e.g. "Bestseller", "Best price")
   - Rating + review count
   - "From $X" price + **View Deal** CTA (opens provider in new tab)
   - Provider pills (all affiliate links for that deal)
   - "Mark as Booked" button to record external bookings
   - Shows **BookingBadge** if already booked via Stripe or marked externally

4. **`src/components/booking/DealsPanel.tsx`** — Tabbed panel inside each route card:
   - 5 tabs: ✈️ Flights / 🏨 Hotels / 🚄 Trains / 🎭 Activities / 🍽 Dining
   - Badge count per tab
   - Loading skeleton (pulse animation while deals fetch)
   - "✅ Live prices from Amadeus" badge when live data is available, else "Comparing best prices"
   - Provider attribution footer

5. **`src/screens/PlanningScreen.tsx`** — Post-add-to-trip UX changes:
   - `createdTrips` state tracks which route IDs have been added
   - `routeDeals` state holds generated deal cards per route
   - After `handleAddToTrip` succeeds: stores trip ID, generates deals, shows DealsPanel
   - Button swaps to green **"📅 Go to Calendar"** — navigates to `/calendar`
   - `planningStore` persists planning UI state across tab changes

**Booking flow:**
```
Search trip → AI suggests routes → Select route → "Add to Trip"
  → Trip created in Supabase → DealsPanel appears with hotel/flight/activity deals
  → User clicks deal → Opens provider (Booking.com, Skyscanner, Viator, etc.)
  → User books externally → Clicks "Mark as Booked" in app → recorded in bookings table
  → "Add to Trip" button becomes "📅 Go to Calendar" → navigates to trip dates
```

**Files changed:**
- `src/services/affiliateLinks.ts` — new: affiliate URL generator
- `src/services/deals.ts` — new: curated deal generator
- `src/components/booking/DealCard.tsx` — new: individual deal card
- `src/components/booking/DealsPanel.tsx` — new: tabbed deals panel
- `src/screens/PlanningScreen.tsx` — updated: deals integration + button swap

---

---

### Session 10 — LLM-Powered Adaptive Voice Agent & Precise Location (COMPLETE)

Buddy's hands-free mode is now a fully functional voice agent. Every conversation is personalised to the user's tone setting (warm / energetic / calm), travel history, current location, and time of day. The voice loop no longer freezes after the first command.

**What was done:**

1. **`src/services/buddyPersonality.ts`** — New adaptive personality engine:
   - `buildSystemPrompt(ctx)` — builds a dynamic ChatGPT system prompt from `buddyName`, `tone`, travel history, location, vibe archetype, and time-of-day flavour
   - `extractAction(response)` — parses `[ACTION:xxx]` keywords from ChatGPT responses to drive navigation and POI search without regex intent matching
   - `actionToRoute()` / `isNearbyAction()` — maps actions to routes or nearby-search handlers
   - `buildPOINarrationPrompt()` — personality-aware POI storytelling for proactive alerts
   - Tone modes: **warm** (gentle encouragement), **energetic** (exclamation, high energy), **calm** (measured, no exclamation marks)

2. **`src/services/speech.ts`** — Added `requestMicPermission()` (explicit `getUserMedia` prompt) and `continuous` option for `startListening()` that auto-restarts on end or no-speech errors.

3. **`src/services/voicePipeline.ts`** — Rewritten: uses `buildSystemPrompt()` for personality-adapted responses, extracts actions from responses, fires `onNavigate`/`onNearbySearch` callbacks.

4. **`src/components/BuddyPanel/BuddyPanel.tsx`** — Rewritten: LLM action extraction replaces regex intent detection, personality-aware prompts, requests mic permission before listening, shows user's custom `buddyName` in header.

5. **`src/components/HandsFreeMode/HandsFreeToggle.tsx`** — Major rewrite:
   - Requests mic permission on toggle-on
   - `listenCycle` counter pattern — each command spawns a fresh STT instance (fixes freeze-after-first-command bug caused by stale nested callbacks)
   - Stops STT before TTS to prevent audio feedback loop, restarts after response
   - Extracts `[ACTION:xxx]` to navigate or trigger POI search; exits hands-free on navigation
   - Shows live transcript + last Buddy response on the dimmed overlay
   - Waveform animates only when actively listening

6. **`src/services/chatgpt.ts`** — `generatePOINarration()` accepts optional `personalityPrompt` to override the hardcoded warm-OmniBuddy system prompt.

7. **`src/services/proactiveAlerts.ts`** — Builds a personality-aware narration prompt via `buildPOINarrationPrompt()` and passes it to `generatePOINarration()`.

8. **`src/services/location.ts`** — Fixed imprecise location (was reporting 4km off):
   - `watchPosition`: `enableHighAccuracy: false` → `true`, `maximumAge: 60000` → `5000`
   - Initial request timeout: 10s → 15s
   - Fallback cache reduced from 300s → 30s

9. **`src/layouts/AppLayout.tsx`** — Wires `useUserHistory()` into both `<BuddyPanel>` and `<HandsFreeToggle>` so personality context includes real travel history.

**Hands-free voice loop:**
```
Toggle on → Request mic permission → Acquire Wake Lock
  → Continuous STT (Web Speech API)
  → User speaks → Stop STT (prevent feedback)
  → buildSystemPrompt(tone + history + location)
  → callChatGPT → extractAction()
  → speak(response) via ElevenLabs / TTS
  → If [ACTION:plan_trip] → exit hands-free, navigate
  → If [ACTION:nearby_food] → stay, POI engine handles
  → Increment listenCycle → fresh STT instance → loop
```

**Figma workflow diagram:** [Hands-Free Voice Agent — Session 10](https://www.figma.com/online-whiteboard/create-diagram/4ee6f6de-aec4-415b-af97-4a7fd68ffa5d)

**Files changed:**
- `src/services/buddyPersonality.ts` — new: adaptive personality engine
- `src/services/speech.ts` — mic permission + continuous mode
- `src/services/voicePipeline.ts` — personality-aware, action-driven
- `src/components/BuddyPanel/BuddyPanel.tsx` — LLM actions + personality
- `src/components/HandsFreeMode/HandsFreeToggle.tsx` — full voice agent rewrite
- `src/services/chatgpt.ts` — optional personality prompt for POI narration
- `src/services/proactiveAlerts.ts` — personality-aware POI narration
- `src/services/location.ts` — high-accuracy GPS fix
- `src/layouts/AppLayout.tsx` — user history wired to voice components

---

### Session 11 — Accessibility Audit, Budget UX & Interactive Route Maps (COMPLETE)

Full Web Interface Guidelines audit (Vercel standards) across 40+ UI files, plus three major feature improvements.

#### Accessibility Audit (Web Interface Guidelines)

Reviewed the entire codebase against Vercel's Web Interface Guidelines covering accessibility, focus states, forms, animation, typography, performance, navigation, dark mode, and hydration safety. Fixed ~100+ violations across 40+ files.

**Global fixes:**
- `index.html` — Added `<meta name="color-scheme" content="light dark">`, dual `theme-color` tags for light/dark, skip-to-content link
- `index.css` — Added `color-scheme: dark` / `color-scheme: light` on theme selectors, global `@media (prefers-reduced-motion: reduce)` reset that disables all animations
- `AppLayout.tsx` — Theme effect now dynamically sets `colorScheme` and updates `theme-color` meta tag; `<main>` has `id="main-content"` for skip-nav

**Project-wide fixes (30+ files):**
- **Focus states**: Replaced ~30 instances of `focus:outline-none` without replacement with `focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`
- **Form labels**: Added `aria-label` and `autocomplete` attributes to ~25 inputs across AuthSheet, PlanningScreen, BudgetScreen, ProfileScreen, FlightBookingModal, etc.
- **Modal semantics**: Added `role="dialog"`, `aria-modal="true"`, and Escape-to-close to 10 modal/sheet components
- **Semantic HTML**: `Card` and `Chip` now render with `role="button"`, `tabIndex={0}`, and keyboard handlers when `onClick` is present
- **aria-live regions**: Added to BuddyPanel status text, ChatFeed, VoiceOverlay, ProactiveAlert, OAuthCallbackScreen

#### Budget Health — Error Display & Buddy Analysis

- **BudgetSetupCard** — Now captures and displays Supabase errors inline instead of silently failing
- **QuickLog** — Shows validation errors ("No active trip found", "Please enter an amount") and surfaces database errors with `role="alert"`
- **"Ask Buddy about your budget"** — Rewired from broken `showOverlay(null)` to `openWithMessage()`. Now opens BuddyPanel with a detailed budget analysis prompt containing full category breakdown, recent expenses, daily target vs actual pace, and days remaining. GPT gives short, friendly, actionable advice (4-5 sentences, no bullet points)

#### Buddy Chat — Conversation Memory

- **`src/services/chatgpt.ts`** — Added `callChatGPTWithHistory()` that accepts a full `ChatMsg[]` array instead of a single user message. Removed unused `tryModel` function.
- **`BuddyPanel.tsx`** — `handleSend` now passes the last 20 messages as conversation history to GPT. Buddy remembers what you discussed and gives contextually coherent follow-ups.

#### Interactive Route Maps in Chat

When users ask for directions, Buddy now renders an interactive Leaflet map inline in the chat with a real road-following route.

**How it works:**
1. `buddyPersonality.ts` — GPT system prompt instructs the model to emit `[ROUTE:label@lat,lng|label@lat,lng]` tags with start/destination coordinates
2. `extractAction()` — Updated to parse both `[ACTION:...]` and `[ROUTE:...]` tags from responses, returning typed `RouteWaypoint[]`
3. `src/services/routing.ts` — **New file.** Calls OSRM free API for road-following geometry. Calculates realistic durations per mode (walk 5 km/h, bike 15 km/h, car 30 km/h urban) since OSRM demo only has driving profile. Auto-recommends best mode based on distance (<1.5 km → walk, <5 km → bike, ≥5 km → car).
4. `buddyPanelStore.ts` — `ChatMessage` now includes optional `RouteData` with waypoints, geometry, summary, mode, and `allSummaries`
5. `ChatFeed.tsx` — Renders `RouteMap` component for messages with route data:
   - Interactive Leaflet map with A/B markers and road-following polyline
   - **Transport mode picker** — three tappable tabs (🚶 / 🚲 / 🚗) showing time estimates for each mode
   - "Recommended" badge when user selects a non-optimal mode
   - "Open in Maps" link that opens Google Maps with correct transport mode pre-selected
6. `BuddyPanel.tsx` — After GPT returns waypoints, fetches real route from OSRM in background and updates the message with geometry + summaries

**Route data flow:**
```
User asks "how do I get to X?" → GPT returns text + [ROUTE:You@lat,lng|X@lat,lng]
  → extractAction() parses waypoints → Message added with waypoints (map shows immediately)
  → fetchRoute() calls OSRM → real road geometry returned
  → Message updated with geometry + per-mode durations + recommended mode
  → Map re-renders with road-following polyline + mode picker tabs
```

**Files changed:**
- `index.html` — color-scheme meta, dual theme-color, skip-nav link
- `src/index.css` — color-scheme, reduced-motion reset
- `src/layouts/AppLayout.tsx` — dynamic color-scheme + theme-color, main id
- `src/services/chatgpt.ts` — `callChatGPTWithHistory()`, `ChatMsg` type export
- `src/services/buddyPersonality.ts` — route tag instructions in system prompt, `extractAction()` parses `[ROUTE:...]`, `RouteWaypoint` type
- `src/services/routing.ts` — **new**: OSRM routing, mode-specific durations, mode recommendation
- `src/stores/buddyPanelStore.ts` — `RouteData` interface with geometry/summary/mode/allSummaries
- `src/components/BuddyPanel/BuddyPanel.tsx` — conversation history, route fetching, mode guessing
- `src/components/BuddyPanel/ChatFeed.tsx` — `RouteMap` component with Leaflet + mode picker
- `src/screens/BudgetScreen.tsx` — error display, detailed budget prompt, openWithMessage
- 30+ component/screen files — focus states, labels, autocomplete, dialog roles, aria-live

---

## Version

`v1.1.0 — Accessibility audit, budget analysis, conversation memory, interactive route maps`
