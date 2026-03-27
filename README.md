# OmniTrip

AI-powered travel companion app. Plan trips, explore destinations with a day-by-day itinerary, track budgets, and chat with OmniBuddy — your personal travel AI.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (`@theme` in CSS, no config file) |
| State | Zustand (buddyStore, locationStore, tripStore, etc.) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Storage) |
| AI Chat | OpenAI ChatGPT API (with demo fallback) |
| AI Planning | Claude API for trip suggestions (with demo fallback) |
| Maps | Leaflet.js |
| Charts | Recharts |
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
├── services/           # supabase, chatgpt, claude, speech, tts, location, poi, proactiveAlerts
├── stores/             # Zustand stores (buddy, location, trip, user, voice, buddyPanel)
├── data/               # templates.ts (curated destination templates)
├── layouts/            # AppLayout (main shell with nav + buddy + alerts)
├── utils/              # mapRow.ts (snake_case <-> camelCase)
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
```

### Test Account

```
Email:    testuser@gmail.com
Password: test1234
```

## Supabase

- **Project ID**: `tswpybvapytccwdixoxo`
- **Auth**: Email/password with auto-confirm trigger (bypasses email verification for demo)
- **RLS**: All tables restricted to `auth.uid() = user_id`
- **Tables**: profiles, trips, destinations, trip_days, activities, budgets, expenses, calendar_events, travel_profiles, journal_entries, dream_trips, trip_reflections

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

## Key Design Decisions

- **snake_case ↔ camelCase**: DB uses Postgres convention, frontend uses JS convention. `mapRow.ts` handles conversion.
- **Demo fallbacks**: All AI features (chat, planning, POI) have demo/offline fallback modes when API keys are missing or calls fail.
- **Safe area insets**: `viewport-fit=cover` + `env(safe-area-inset-bottom)` for mobile browser chrome.
- **Optimistic UI**: Profile and activity updates apply locally first, then persist to Supabase.
- **Auto-confirm auth**: Supabase trigger auto-confirms new users for demo/testing flow.

## Version

`v0.3.0 — Advanced Features Build`
