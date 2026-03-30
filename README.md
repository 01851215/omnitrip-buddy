# OmniTrip

AI-powered travel companion app. Plan trips, explore destinations with a day-by-day itinerary, track budgets, and chat with OmniBuddy — your personal travel AI.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (`@theme` in CSS, no config file) |
| State | Zustand (buddyStore, locationStore, tripStore, etc.) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| AI Chat | OpenAI GPT-5.4 API (with demo fallback) |
| AI Planning | GPT-5.4 for trip suggestions (with demo fallback) |
| Booking | Amadeus API (real prices) + Stripe Checkout (payments) + affiliate links |
| Maps | Leaflet.js |
| Charts | Custom SVG (VibeChart, CategoryBreakdown) |
| Voice | Web Speech API (STT) + ElevenLabs / browser TTS |
| POI | Foursquare Places API (with demo fallback) |

## Project Structure

```
src/
├── components/
│   ├── auth/           # AuthSheet, AuthGuard, AuthProvider
│   ├── Buddy/          # BuddyContainer (floating button), BuddyOverlay
│   ├── BuddyPanel/     # Chat panel (ChatFeed, POIFeed, QuickActions, PanelInput)
│   ├── BottomNav/      # 5-tab bottom navigation
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
├── services/           # supabase, chatgpt, travelInsights, speech, tts, location, poi, proactiveAlerts
├── stores/             # Zustand stores (buddy, location, trip, user, voice, buddyPanel)
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
| `/home` | HomeScreen | Active trip dashboard |
| `/plan` | PlanningScreen | AI trip planning studio |
| `/destination/:id` | DestinationDetailScreen | Itinerary + map for a destination |
| `/calendar` | CalendarScreen | Timeline & month views |
| `/budget` | BudgetScreen | Expense tracking & charts |
| `/footprints` | FootprintsScreen | Past journeys & reflections |
| `/profile` | ProfileScreen | User settings & preferences |

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
- **RLS**: All tables restricted to `auth.uid() = user_id`
- **Tables**: profiles, trips, destinations, trip_days, activities, budgets, expenses, calendar_events, travel_profiles, journal_entries, dream_trips, trip_reflections, bookings
- **Edge Functions**: `search-deals` (Amadeus proxy), `create-checkout` (Stripe session), `stripe-webhook` (payment confirmation)

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
- Created `useProfile` hook — fetches/upserts to both `profiles` and `travel_profiles` tables
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

#### 4. Profile auto-save to Supabase

All profile sections now auto-save without requiring a Save button:

- **Basic Info** (name, age, bio): Always-editable fields with 800ms debounced save to `profiles` table.
- **Buddy Settings** (name, tone): Buddy name auto-saves with debounce; tone buttons save immediately to `travel_profiles.buddy_settings`.
- **Quiet Mode**: Now persists to `travel_profiles.notification_settings.quietMode` and restores on load, so the setting survives page refreshes and is available to the LLM.

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

2. **`updateProfile` → upsert** (`src/hooks/useProfile.ts`) — Switched from `.update()` (silent no-op on missing row) to `.upsert({ onConflict: "id" })` so saves are safe regardless of DB state.

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

## Key Design Decisions

- **snake_case ↔ camelCase**: DB uses Postgres convention, frontend uses JS convention. `mapRow.ts` handles conversion.
- **Demo fallbacks**: All AI features (chat, planning, POI) have demo/offline fallback modes when API keys are missing or calls fail.
- **Safe area insets**: `viewport-fit=cover` + `env(safe-area-inset-bottom)` for mobile browser chrome.
- **Optimistic UI**: Profile and activity updates apply locally first, then persist to Supabase.
- **Auto-confirm auth**: Supabase trigger auto-confirms new users for demo/testing flow.
- **Auto-save with debounce**: Profile fields use an 800ms debounce before persisting to Supabase, preventing excessive writes.
- **Custom SVG charts over libraries**: VibeChart and CategoryBreakdown are implemented as inline SVG/JSX to avoid adding Recharts or similar dependencies for a small number of visualizations.
- **LLM with computed fallbacks**: All AI-powered features (Buddy reflections, travel vibe analysis, trip planning) have client-side fallbacks that produce reasonable output from raw data when API keys are missing.

## Version

`v0.7.0 — Profile Fixes, Password Reset & Email Service`
