# OmniTrip — Product Specification

## 1. Vision

OmniTrip is a behaviour-aware travel companion for solo travellers aged 18–26 (university students and young professionals). It provides constraint-based trip planning, a smart calendar that integrates personal schedules, dynamic journey maps, budget tracking with smart defaults, and a memory system that stores and analyses past trips. A companion "Buddy" layer guides users in real time — making travel decisions intuitive and continuous rather than one-off.

**V1 Goal:** Demo-ready product — core flow works end-to-end, polished enough to show investors or employers.

---

## 2. Target User

| Attribute | Detail |
|-----------|--------|
| Age | 18–26 |
| Profile | University students, young graduates, early-career professionals |
| Travel style | Solo, budget-to-mid-range, 1–4 week trips |
| Tech comfort | High — digital-native, comfortable with AI assistants |
| Key pain points | Decision fatigue, budget anxiety, fragmented tools (Google Maps + Sheets + Notes + Calendar), losing trip memories |
| Devices | Primarily mobile (on the move), desktop for pre-trip planning |

---

## 3. Platform & Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 19 + TypeScript + Vite | Already scaffolded in project |
| 3D Character | Spline (via `@splinetool/react-spline`) | Buddy is a live Spline 3D scene — never a static image or background video |
| Styling | Tailwind CSS | Matches the Figma design system — warm neutrals, rounded cards |
| Routing | React Router v7 | Client-side navigation between screens |
| State | Zustand | Lightweight, works well with local-first |
| Local DB | IndexedDB via Dexie.js | Structured local storage, offline-first |
| Maps | Mapbox GL JS | Best customisation, free tier covers demo usage |
| LLM (cloud) | Claude API (Anthropic) | Primary Buddy reasoning engine |
| LLM (offline) | WebLLM (Llama 3.2 3B) | Light re-planning when offline |
| Calendar import | Google Calendar API (read-only) | Import existing events as context |
| Currency | Open Exchange Rates API | Real-time currency conversion |
| Places/POI | Mapbox Geocoding + Foursquare Places | POI discovery and search |
| STT | Web Speech API / Deepgram | Speech-to-text for voice mode |
| TTS | ElevenLabs API | Personality voice for Buddy responses |
| Auth | Supabase Auth (optional sign-up) | Guest mode by default, account for backup |
| Cloud sync | Supabase (backup/restore only) | Single-device default, no real-time multi-device sync |
| Build target | Responsive web app (mobile-first) | PWA conversion in a future phase |

---

## 4. Buddy — The Companion Layer

### 4.1 Buddy's Role

Buddy is a context-dependent AI companion that shifts between being the primary interface and a sidebar assistant:

- **Front-and-centre:** On the onboarding screen, home screen, during conversational planning, and on simple mobile tasks — Buddy (live Spline 3D scene) is the main interaction surface
- **Sidebar/overlay:** On complex screens (map, calendar, budget charts) — Buddy shrinks to a small floating Spline scene in the corner/bottom-sheet that offers contextual insights
- **Transitions:** Auto-animated via Spline runtime API based on active screen, with a manual toggle so users can pin Buddy in either mode
- **Everywhere live:** Buddy is always a live Spline 3D render — never a static image, video background, or pre-recorded clip

### 4.2 Three Moods

Buddy has three visual + behavioural states, rendered as a **live Spline 3D scene** (not pre-recorded video or static images). The Spline scene exposes animation triggers that the app controls via the Spline runtime API:

| Mood | Spline Animation State | Behavioural Effect | Trigger |
|------|----------------------|-------------------|---------|
| **Idle** | Calm, gentle floating loop | Neutral suggestions, standard recommendations | Default state, no active task |
| **Thinking** | Processing/spinning animation | Buddy is computing/planning — shows progress | User asks a question, solver is running |
| **Excited** | Energetic bounce/glow animation | More adventurous suggestions, highlights discoveries | User completes a milestone, finds a great deal, new trip planned |

> **Implementation note:** The existing `.mp4` files (`idle.mp4`, `thinking.mp4`, `goulding.mp4`) are reference videos only — they document the intended animation for each mood. The production app renders Buddy as a **live interactive Spline scene** that transitions between moods in real time. No static images or video backgrounds of Buddy should appear in the UI.

Moods influence recommendation tone:
- **Idle Buddy** suggests balanced, practical options
- **Thinking Buddy** shows what it's considering (transparency)
- **Excited Buddy** pushes more adventurous alternatives, celebrates achievements

### 4.3 Signal Processing

Buddy reacts to both explicit and implicit signals:

**Explicit signals:**
- Direct chat messages ("I'm tired", "find me something cheap")
- Mood self-reporting (if user sets their own state)
- Activity ratings and feedback

**Implicit signals (web-feasible):**
- Time of day (morning vs evening suggestions)
- Pace of activity completion (rushing vs leisurely)
- Skipped/deferred activities
- Budget burn rate (spending faster/slower than planned)
- Time since last interaction
- Browser geolocation (when app is foregrounded, with permission; manual fallback)

### 4.4 LLM Architecture

```
User Input → Claude API (intent parsing + constraint extraction)
                ↓
         Constraint Solver (deterministic optimisation)
                ↓
         Claude API (natural language presentation + personality)
                ↓
         Buddy Response (with mood-appropriate animation)
```

**Offline fallback:** WebLLM (Llama 3.2 3B) handles:
- Itinerary lookups and display from cached data
- Light re-planning (shuffle items, suggest alternatives from already-fetched POIs)
- Basic conversational responses
- Expense logging with cached smart defaults

**Does NOT work offline:** New destination research, real-time currency rates, calendar sync, cloud backup, voice mode.

### 4.5 Voice Mode

Voice mode turns Buddy into a hands-free conversational companion — like talking to a travel-savvy friend. The user can complete **any core workflow** via voice: planning, budgeting, calendar management, and getting location-based suggestions.

**Technical pipeline:**
```
User speaks → Web Speech API / Deepgram (STT)
                    ↓
              Claude API (same LLM → Solver → LLM pipeline as text)
                    ↓
              ElevenLabs TTS (warm, personality-matched voice)
                    ↓
              Buddy speaks back (audio) + screen updates simultaneously
```

**Voice UX:**
- **Activation:** Microphone button on the Buddy overlay / bottom nav. Tap to start, tap to stop (walkie-talkie style, turn-based).
- **Visual + audio simultaneous:** When the user says "plan my day tomorrow", Buddy speaks the response AND the screen shows the itinerary being built in real time. Voice doesn't replace the visual UI — it augments it.
- **Buddy animation syncs to speech:** Spline character animates lip-sync or energy-level movements while speaking. Transitions to Thinking mood while processing.
- **Fallback:** If microphone permission is denied or STT fails, graceful fallback to text input with a message: "I can't hear you right now — type instead."
- **Context-aware:** Voice mode inherits the current screen context. Speaking "add $15 for ramen" on the Budget screen logs an expense. Speaking the same on the Home screen also works (Buddy routes to the right action).

**Voice personality:**
- Warm, friendly, slightly informal — matches the 18-26 target demographic
- Uses the user's name naturally
- Adapts tone to Buddy's current mood (calm when Idle, energetic when Excited)
- ElevenLabs voice ID configured per-app (single consistent voice for Buddy)

### 4.6 Location-Aware Buddy (Live Tour Guide)

When the user grants geolocation permission, Buddy becomes a proactive, location-aware tour guide that surfaces contextual suggestions based on where the user physically is.

**How it works:**
- **Foreground tracking:** When the app is open, browser Geolocation API polls position at a configurable interval (default: every 5 minutes)
- **Periodic check-in prompts:** Even when the user hasn't opened the app in a while, scheduled notifications (via service worker when available) prompt: "You're in Shibuya — want to see what's nearby?"
- **POI matching:** Current coordinates are matched against Foursquare Places API + Mapbox POIs, filtered by the user's known preferences from their TravelProfile
- **Smart proactive alerts:** Buddy only interrupts for high-confidence matches:
  - The spot matches the user's known interests (e.g. they love ramen → ramen shop 200m away)
  - The spot is highly rated (4.5+ stars)
  - The user hasn't visited it before
  - It fits within the current day's budget allowance
  - Low-confidence matches are saved silently and shown when the user asks "what's nearby?"

**Suggestion categories:**
- **Food & Drink:** Restaurants, cafés, street food, bars — filtered by cuisine preferences and budget
- **Landmarks & Culture:** Temples, museums, viewpoints, historical sites
- **Entertainment:** Markets, festivals, live music, local events
- **Practical:** ATMs, pharmacies, wifi spots, transport hubs
- **Hidden gems:** Off-the-beaten-path spots that match the user's adventurousness level

**Privacy:**
- Location permission is explicitly requested, never assumed
- User can disable location tracking at any time from Profile settings
- Location data is stored locally only (never sent to cloud) unless the user opts into trip route recording for their Footprints memory
- Clear explanation on permission request: "Buddy uses your location to suggest nearby food, landmarks, and experiences while you explore. You can turn this off anytime."

**Proactive alert UX:**
- Buddy overlay slides up with a contextual suggestion: "Hey [name], there's an incredible street food alley 3 minutes from you — locals swear by the yakitori. Want me to add it to today's plan?"
- CTAs: "Show me" (opens map with directions) / "Not now" / "Don't suggest food spots" (teaches Buddy)
- Frequency cap: Maximum 3 proactive alerts per hour to avoid annoyance
- "Quiet mode" toggle to suppress all proactive alerts temporarily

---

## 5. Screens & Features

### 5.1 Onboarding — Login & Register

**Figma ref:** `4:321`

- **Live Buddy** is the centrepiece of the onboarding screen — the Spline 3D character plays its Idle animation, replacing the static logo icon from the Figma mock. Buddy subtly reacts (e.g. wave, look around) to draw the user in.
- OmniTrip wordmark appears above Buddy
- Tagline "Your next chapter begins here." below Buddy
- Two paths: Login / Register
- **Guest mode:** App is fully usable without an account. Prompt to create account after first trip to prevent data loss.
- Auth provider: Supabase Auth (email + social login)
- Tagline: "THE WORLD AWAITS"

### 5.2 Home — Buddy Dock

**Figma ref:** `4:2`

The home screen is a vertically scrolling dashboard with Buddy as the anchor:

1. **Header:** OmniTrip logo + search + profile avatar
2. **Ongoing Journey Card:** Hero card showing active trip (e.g. "Bali Spiritual Escape"), progress indicator ("Day 4 of 10"), background image
3. **Plan Next Move:** Buddy prompt — "Let our concierge find the perfect hidden gem for your tonight's dinner." + "Explore Map" link
4. **Calendar Widget:** Compact pill showing event count ("3 Events Today"), tappable to open full calendar
5. **Budget Tracker Widget:** Compact pill with status message ("Sarah, you're on track")
6. **Buddy Reflection:** A card where Buddy shares a proactive insight based on implicit signals. Example: *"Sarah, I noticed you spent quite a bit on those artisanal ceramics today. They are beautiful, but perhaps we should pivot to local street food for dinner to balance the aesthetic experience with our mindful budget?"* — with "Accept Suggestion" and "Tell me more" CTAs
7. **Upcoming Dreams:** Bucket list / wish list of future trips. Toggle between "Bucket" and "List" views. Trip cards with destination image, title, and description.
8. **Bottom Nav:** 5 tabs — Home, Journeys, Plan, Calendar, Profile

### 5.3 The Planning Studio

**Figma ref:** `4:508`

Conversational trip planning powered by the hybrid LLM + constraint solver:

1. **Header:** "The Planning Studio" — "Craft your next escape with intuitive guidance. Tell OmniBuddy where your heart is leaning, and we'll handle the logistics."
2. **Chat Input:** Natural language input — "Where do you want to explore?"
3. **Suggested Prompts:** Quick-start chips:
   - "A quiet weekend in the Swiss Alps"
   - "High-speed train route across Japan"
   - "Coastal drive through Portugal"
4. **Top Route Matches:** After processing, Buddy returns ranked route cards:
   - Card with hero image, "RECOMMENDED" badge, title, description, duration, "Explore" CTA
   - Budget indicator ("Good Sweet-ish Mix")
5. **OmniBuddy Insights:** Buddy explains its reasoning with personality:
   - *"I kept the Alpine route light to give you breathing room. Since you mentioned enjoying quiet mornings, I've avoided the heavy tourist hotspot in Interlaken."*
   - "WHY THIS WORKS" section with checkmarks (matches preferences, climate-aligned, solo-friendly)
   - "Adjust Preferences" CTA
6. **Mini-map:** Route visualised on embedded Mapbox map at the bottom

**Constraint Solver Input:**
- Budget cap (total or daily)
- Duration
- Interests/anti-interests (parsed from natural language)
- Energy/pace preference (from past trip memory or explicit)
- Time constraints (calendar conflicts)
- Travel style (adventure, cultural, relaxation — learned over time)

**Constraint Solver Output:**
- Ranked itinerary options
- Per-day breakdown with time blocks
- Estimated costs per category
- Alternative suggestions for each slot

### 5.4 Calendar — Sanctuary Schedule

**Figma ref:** `4:355`

Smart calendar that merges travel and personal events:

1. **Date Header:** "October 24 — Your Sanctuary Schedule"
2. **View Toggle:** Timeline (hourly) / Month
3. **Event Types:**
   - **Travel Events** (teal cards): Flights, activities, check-ins — e.g. "Flight BA2490, Heathrow (LHR) → Lisbon (LIS)"
   - **Personal Events** (green cards with orange border): Imported from Google Calendar — e.g. "Project Sync, Zoom Call, 09:30–10:30"
   - **Conflicts** shown with red "CONFLICT" badge and explanation ("Overlaps with flight check-in")
4. **Buddy Suggestions:** "Suggested: Mindful Buffer — Recommended 30m window for hydration & stretch" with "Add Slot" CTA
5. **Today's Pulse:** Summary card with:
   - Travel Intensity: High/Medium/Low (based on event count)
   - Focus Balance: Fragmented/Balanced/Deep (based on free time blocks)
6. **Buddy Insight (overlay):** Conflict resolution — "I found a conflict. Best time to move Flight BA2490 to 07:00 to avoid your Project Sync?" with "Move" / "Ignore" CTAs

**Calendar data flow:**
- Google Calendar events imported read-only via Google Calendar API
- Trip events created/managed within OmniTrip
- Buddy detects overlaps and suggests resolutions
- All planning happens in OmniTrip — no write-back to Google Calendar

### 5.5 Budget Health

**Figma ref:** `4:148`

Budget tracking with smart defaults and Buddy reassurance:

1. **Header:** "Budget Health — Tracking your Kyoto journey"
2. **Summary:** Planned ($3,200) vs Actual ($1,842) — visual comparison
3. **Spending Chart:** Area chart showing spend trajectory over time
4. **Soul-Fund Allocation:** Donut chart breaking spend into categories:
   - "Stays & Rest" (60%), "Local Flavors" (25%), etc.
   - Centre shows total spent ($1.8k)
5. **Recent Flow:** Transaction list with emoji category icons, amount, location, time, category tag
6. **Buddy Reassurance (overlay):** *"You're slightly over on food, but on track for your stays. Consider a quiet picnic for dinner tonight. Kyoto's riverside is perfect for a peaceful meal."*

**Quick-log expense entry:**
- Buddy suggests likely expenses based on: location + time of day + cost-of-living data + user's historical spending
- User confirms or adjusts amount, currency, category
- Currency auto-detected from current location, conversion handled via Open Exchange Rates
- Categories use the app's vocabulary: "Stays & Rest", "Local Flavors", "Moving", "Experiences", "Essentials"

**Smart defaults data:**
- Static cost-of-living dataset per city/country (bootstrapped)
- Personalised over time from user's own spending history
- LLM fills gaps for unusual items

### 5.6 Your Footprints — Travel Memory

**Figma ref:** `4:684`

The memory and reflection system:

1. **Header:** "Your Footprints" — "A collection of every path you've walked, the stories you've lived, and the ways the world is changing you."
2. **Stats Bar:** Total trips (12), total places (8,420), years travelling (3y)
3. **The Connected Path:** World map showing all visited locations connected by route lines ("Eurasian Traverse")
4. **Timeline of Being:** Chronological feed of trip memories with:
   - Location photos
   - Short journal entries
   - Buddy-generated insights per memory (e.g. "Recommended as a personal favourite")
5. **Behavioural Insights Cards:**
   - "Slower Pace Preference" — *"Your data shows you spent 40% more time in natural areas..."*
   - "Cultural Depth" — *"In 'Idle time' areas, you consistently gravitate toward..."*
6. **Evolution Narrative:** Long-form Buddy-generated reflection:
   - *"From fast-paced exploration to nature-led stillness."*
   - *"In 2023, you were hunting for landmarks. In 2024, you sat in one spot..."*
7. **Next Chapter CTA:** "Ready for the next chapter?" → "Plan a New Journey" button

**Post-trip reflection flow:**
- After a trip ends, Buddy proactively prompts a review
- User can rate activities, add notes, highlight favourite moments
- Buddy also passively analyses: completed vs skipped activities, spending patterns, pace
- Even if user skips the active review, passive insights still accumulate

**Pattern analysis (feeds back into planning):**
- Pace preferences (rushed vs relaxed)
- Spending habits by category and region
- Activity type preferences (nature, culture, food, nightlife)
- Time-of-day patterns (morning person vs night owl)
- These patterns inform future trip recommendations in the Planning Studio

---

## 6. Navigation

Bottom navigation bar with 5 tabs + floating voice button:

| Icon | Label | Screen |
|------|-------|--------|
| Home | HOME | Home with Buddy Dock |
| Book | JOURNEYS | Your Footprints (Memory) |
| Map pin | PLAN | The Planning Studio |
| Calendar | CALENDAR | Sanctuary Schedule |
| Person | PROFILE | User profile + settings |

**Voice button:** A floating microphone FAB (floating action button) positioned above the bottom nav bar, slightly overlapping. Tapping it opens voice mode overlay on any screen. The button pulses gently when Buddy has a proactive location-based suggestion ready.

---

## 7. Data Model

### 7.1 Core Entities

```
User
├── id: uuid
├── email: string (optional — guest mode)
├── displayName: string
├── createdAt: timestamp
├── preferences: UserPreferences
└── travelProfile: TravelProfile (learned over time)

Trip
├── id: uuid
├── userId: uuid
├── title: string
├── status: 'planning' | 'active' | 'completed'
├── startDate: date
├── endDate: date
├── destinations: Destination[]
├── budget: Budget
├── itinerary: ItineraryDay[]
├── reflection: TripReflection (post-trip)
└── createdAt: timestamp

Destination
├── id: uuid
├── name: string
├── country: string
├── coordinates: { lat, lng }
├── arrivalDate: date
├── departureDate: date
└── timezone: string

ItineraryDay
├── id: uuid
├── tripId: uuid
├── date: date
├── activities: Activity[]
├── buddyNotes: string[]
└── energyLevel: 'high' | 'medium' | 'low' (inferred or reported)

Activity
├── id: uuid
├── title: string
├── type: 'transport' | 'accommodation' | 'experience' | 'food' | 'rest' | 'free'
├── startTime: datetime
├── endTime: datetime
├── location: { name, coordinates }
├── status: 'planned' | 'completed' | 'skipped' | 'modified'
├── estimatedCost: Money
├── actualCost: Money (optional)
├── rating: 1-5 (post-trip)
├── notes: string
└── buddySuggested: boolean

Budget
├── totalPlanned: Money
├── totalSpent: Money
├── currency: string (primary display currency)
├── categories: BudgetCategory[]
└── dailyTarget: Money

Expense
├── id: uuid
├── tripId: uuid
├── amount: number
├── currency: string (original currency)
├── convertedAmount: number (in trip's primary currency)
├── category: 'stays' | 'food' | 'transport' | 'experiences' | 'essentials'
├── description: string
├── location: string
├── timestamp: datetime
├── buddySuggested: boolean (was this pre-filled by Buddy?)
└── receiptNote: string (optional)

CalendarEvent
├── id: uuid
├── source: 'omnitrip' | 'google_calendar'
├── title: string
├── startTime: datetime
├── endTime: datetime
├── type: 'travel' | 'personal'
├── conflictsWith: uuid[] (IDs of conflicting events)
└── buddyResolution: string (suggested fix)

TravelProfile (learned, not input)
├── pacePreference: number (0 = very relaxed, 1 = very packed)
├── budgetStyle: { categoryWeights }
├── activityPreferences: { type: weight }[]
├── timeOfDayPattern: { morningActivity, eveningActivity }
├── cuisinePreferences: string[]
├── avoidances: string[]
└── lastUpdated: timestamp

TripReflection
├── tripId: uuid
├── overallRating: 1-5
├── highlights: string[]
├── buddyInsights: string[] (auto-generated)
├── completedActivities: number
├── skippedActivities: number
├── budgetAccuracy: number (planned vs actual ratio)
├── paceScore: number
└── journalEntries: JournalEntry[]

Money
├── amount: number
└── currency: string (ISO 4217)
```

### 7.2 Local-First Storage

- All data stored in IndexedDB via Dexie.js
- Schema versioned for migrations
- No account required for full local functionality
- Cloud backup is manual export/import to Supabase (not real-time sync)
- No conflict resolution needed — single-device default in V1

---

## 8. Monetisation — Free + Premium

| Feature | Free | Premium |
|---------|------|---------|
| Active trips | 2 | Unlimited |
| Trip history | Last 3 trips | Full history |
| Buddy AI conversations | 20/month | Unlimited |
| Budget tracking | Basic (manual entry) | Smart defaults + insights |
| Calendar import | No | Google Calendar read-only |
| Memory insights | Basic stats | Full behavioural analysis + evolution narrative |
| Cloud backup | No | Yes |
| Offline Buddy | No | Light re-planning via WebLLM |

Usage tracking: count trips, AI calls, and feature access locally. Gate features client-side in V1 (no server enforcement needed for demo).

---

## 9. Design System

Extracted from Figma designs:

### 9.1 Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary-teal` | `#2D6A5A` | Primary buttons, travel event cards, active nav |
| `--accent-peach` | `#E8A87C` | Secondary buttons (Register), warm accents |
| `--bg-cream` | `#F5F1EB` | Page background |
| `--bg-white` | `#FFFFFF` | Card backgrounds |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#6B7280` | Subtitles, metadata |
| `--text-muted` | `#9CA3AF` | Placeholders, inactive nav |
| `--conflict-red` | `#DC2626` | Conflict badges, over-budget warnings |
| `--success-green` | `#16A34A` | On-track indicators, completed items |
| `--card-border` | `#E5E1DB` | Subtle card borders |
| `--buddy-overlay-bg` | `rgba(255,255,255,0.95)` | Buddy insight overlay |

### 9.2 Typography

| Style | Font | Size | Weight |
|-------|------|------|--------|
| H1 (page title) | Serif (e.g. Playfair Display) | 28–32px | Bold |
| H2 (section title) | Serif | 22–24px | Bold |
| H3 (card title) | Sans-serif | 18px | Semibold |
| Body | Sans-serif (Inter or similar) | 14–16px | Regular |
| Caption | Sans-serif | 12px | Regular |
| Buddy speech | Sans-serif italic | 14px | Regular |
| Nav labels | Sans-serif | 10px | Medium |

### 9.3 Component Patterns

- **Cards:** Rounded corners (16px radius), subtle shadow, white background on cream
- **Buddy overlay:** Bottom-sheet style, frosted glass effect, Buddy avatar anchored top-centre
- **Buttons:** Fully rounded (pill shape), teal primary, peach secondary
- **Input fields:** Rounded, light border, floating label
- **Chips/pills:** Small rounded indicators for status, categories, toggles
- **Nav bar:** 5-item bottom nav with icon + label, active item has teal icon + indicator

---

## 10. Key User Flows

### 10.1 First Launch (Guest)

```
Open app → Onboarding screen → "Skip to explore" (guest) or Register
  → Home screen with empty state
  → Buddy greets user: "Welcome! Ready to plan your first adventure?"
  → Tapping "Plan" tab → Planning Studio with suggested prompts
```

### 10.2 Plan a Trip

```
Planning Studio → Type "5 days in Tokyo, $800 budget, hate crowds"
  → Buddy enters Thinking mood
  → LLM extracts constraints: { destination: Tokyo, duration: 5d, budget: $800, avoid: crowds }
  → Constraint solver generates 2-3 ranked itineraries
  → LLM narrates results with personality
  → Buddy enters Excited mood, shows ranked cards
  → User taps "Explore" on preferred route
  → Detailed day-by-day itinerary view
  → User adjusts (drag to reorder in list view, not map)
  → "Start Journey" → Trip becomes active
```

### 10.3 During a Trip

```
Home screen shows active journey card
  → "Plan Next Move" for on-the-fly suggestions
  → Budget quick-log: tap "+" → Buddy pre-fills amount/category → user confirms
  → Calendar shows today's schedule with travel + personal events
  → Buddy Reflection card surfaces proactive insights based on signals
  → If conflict detected → Buddy overlay with resolution options
```

### 10.4 Post-Trip Reflection

```
Trip end date passes → Trip status → 'completed'
  → Buddy prompts: "Your Bali journey has ended. Ready to reflect?"
  → Guided review: rate highlights, add journal notes
  → Buddy generates behavioural insights (passive analysis runs regardless)
  → Trip appears in Your Footprints with full memory
  → Patterns update TravelProfile for future planning
```

---

## 11. API Integrations

| Service | Purpose | Auth | Free Tier |
|---------|---------|------|-----------|
| Claude API | Buddy reasoning, intent parsing, insight generation | API key | Pay-per-token |
| WebLLM | Offline light re-planning | None (client-side) | Free |
| Mapbox GL JS | Interactive maps, route visualisation | API key | 50k loads/month |
| Mapbox Geocoding | Location search, coordinate resolution | API key | 100k requests/month |
| Foursquare Places | POI discovery (restaurants, attractions, etc.) | API key | 500 calls/day |
| Open Exchange Rates | Currency conversion | API key | 1k requests/month |
| Google Calendar API | Read-only calendar import | OAuth2 | Free |
| Supabase | Auth + cloud backup storage | Project key | 50k MAU free |
| ElevenLabs | TTS — Buddy's voice for voice mode | API key | 10k chars/month free |
| Web Speech API | STT — browser-native speech recognition | None | Free (browser built-in) |
| Deepgram (fallback) | STT — higher accuracy fallback if Web Speech API unavailable | API key | 12k mins/year free |

---

## 12. Offline Behaviour

| Feature | Online | Offline |
|---------|--------|---------|
| View itinerary | Full | Full (cached) |
| Log expenses | Smart defaults + conversion | Manual entry, cached rates |
| Buddy chat | Claude API | WebLLM (limited) |
| Map | Live tiles | Cached tiles for current area |
| Calendar | Synced with Google | Local events only |
| Planning | Full constraint solver | Basic shuffling of cached data |
| Voice mode | Full (STT + TTS) | Not available |
| Location alerts | Live GPS + POI fetch | Not available |
| Backup | Available | Queued until online |

---

## 13. Edge Cases & Mitigations

| Edge Case | Mitigation |
|-----------|-----------|
| User loses phone mid-trip | Guest users prompted to create account after first trip. Backup reminder before trip starts. |
| LLM returns unsafe/wrong suggestions | All financial and routing suggestions include disclaimer. User always confirms before Buddy takes action. |
| GPS permission denied | Graceful fallback to manual location input. Buddy asks "Where are you now?" instead. |
| Budget in multiple currencies | Primary display currency set per trip. All expenses stored in original currency + converted amount. |
| Calendar conflict with no good resolution | Buddy offers "Ignore" option. Never force a change. |
| Offline for extended period | Cached data serves core flows. Banner: "Buddy is in offline mode — some features limited." |
| Cost-of-living data missing for a city | LLM estimates from training knowledge. Flag to user: "This estimate is approximate." |
| User abandons trip mid-way | Trip can be marked "ended early". Reflection still available for completed portion. |
| Free tier limits reached | Gentle upsell: "You've used your free Buddy conversations this month. Upgrade for unlimited." Core app still usable. |
| Noisy environment for voice | Show real-time transcript so user can verify STT accuracy. Offer "Switch to text" button. |
| ElevenLabs quota exceeded | Fallback to browser-native SpeechSynthesis API (lower quality but functional). |
| User finds proactive alerts annoying | "Don't suggest [category]" CTA on each alert teaches Buddy. "Quiet mode" toggle suppresses all. Frequency cap at 3/hour. |
| GPS accuracy poor (indoors, tunnels) | Show "approximate location" indicator. Widen POI search radius. Don't send alerts when confidence is low. |
| Voice mode in public (embarrassment) | Voice button is opt-in, never auto-activates. Earphone detection not available on web — user manages this. |

---

## 14. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| First contentful paint | < 2s |
| Time to interactive | < 4s |
| Lighthouse performance | > 90 |
| Offline capability | Core flows work without network |
| IndexedDB storage | < 50MB for typical user |
| WebLLM model size | ~2GB download (one-time, premium only) |
| Accessibility | WCAG 2.1 AA minimum |
| Browser support | Chrome, Safari, Firefox (latest 2 versions) |
| Mobile breakpoint | 390px primary (iPhone 14 — matches Figma frames) |

---

## 15. V1 Scope — What's In vs Out

### In (V1 — Demo-Ready)

- [ ] Onboarding (guest + account creation)
- [ ] Home dashboard with all widgets
- [ ] Planning Studio (conversational + constraint solver + route cards)
- [ ] Calendar (timeline view + conflict detection + Buddy resolution)
- [ ] Budget tracking (quick-log + category chart + Buddy reassurance)
- [ ] Your Footprints (trip memory + basic insights)
- [ ] Buddy with 3 moods + context-dependent positioning
- [ ] Mapbox integration (interactive view-only maps)
- [ ] Voice mode (STT → LLM → TTS with ElevenLabs personality voice)
- [ ] Location-aware Buddy (foreground GPS + smart proactive POI alerts)
- [ ] Claude API integration for Buddy reasoning
- [ ] IndexedDB local storage
- [ ] Bottom navigation
- [ ] Responsive mobile-first design (390px)

### Out (Post-V1)

- PWA (service worker, install prompt, push notifications)
- WebLLM offline Buddy
- Google Calendar import
- Cloud backup via Supabase
- Premium tier enforcement
- Receipt scanning / OCR
- Social features (share trips)
- React Native mobile app
- Month view in calendar
- Drag-to-reorder on map
- Multi-language support

---

## 16. File Structure (Proposed)

```
src/
├── main.tsx                    # App entry
├── App.tsx                     # Router + layout
├── index.css                   # Global styles + Tailwind
├── components/
│   ├── buddy/
│   │   ├── BuddyCharacter.tsx  # Spline 3D character + mood controller
│   │   ├── BuddyOverlay.tsx    # Bottom-sheet insight overlay
│   │   ├── BuddyReflection.tsx # Proactive insight card (home)
│   │   └── BuddyContext.tsx    # Buddy state provider (mood, position)
│   ├── nav/
│   │   └── BottomNav.tsx       # 5-tab navigation bar
│   ├── home/
│   │   ├── OngoingJourney.tsx  # Active trip hero card
│   │   ├── PlanNextMove.tsx    # Quick action card
│   │   ├── CalendarWidget.tsx  # Compact calendar pill
│   │   ├── BudgetWidget.tsx    # Compact budget pill
│   │   └── UpcomingDreams.tsx  # Bucket list section
│   ├── planning/
│   │   ├── ChatInput.tsx       # Natural language input
│   │   ├── SuggestedPrompts.tsx
│   │   ├── RouteCard.tsx       # Trip suggestion card
│   │   ├── BuddyInsights.tsx   # "Why this works" section
│   │   └── MiniMap.tsx         # Embedded Mapbox route preview
│   ├── calendar/
│   │   ├── TimelineView.tsx    # Hourly timeline
│   │   ├── EventCard.tsx       # Travel / Personal event cards
│   │   ├── ConflictBadge.tsx   # Red conflict indicator
│   │   ├── TodaysPulse.tsx     # Intensity + balance summary
│   │   └── BuddyConflict.tsx   # Conflict resolution overlay
│   ├── budget/
│   │   ├── BudgetSummary.tsx   # Planned vs Actual header
│   │   ├── SpendChart.tsx      # Area chart (recharts or visx)
│   │   ├── AllocationDonut.tsx # Category donut chart
│   │   ├── RecentFlow.tsx      # Transaction list
│   │   └── QuickLog.tsx        # Expense entry with smart defaults
│   ├── memory/
│   │   ├── StatsBar.tsx        # Trip count, places, years
│   │   ├── ConnectedPath.tsx   # World map with route lines
│   │   ├── Timeline.tsx        # Chronological memory feed
│   │   ├── InsightCard.tsx     # Behavioural pattern card
│   │   └── EvolutionNarrative.tsx # Long-form Buddy reflection
│   ├── voice/
│   │   ├── VoiceButton.tsx     # Mic activation button (tap-to-talk)
│   │   ├── VoiceOverlay.tsx    # Full-screen voice mode with Buddy + waveform
│   │   ├── VoiceContext.tsx    # Voice state provider (recording, processing, speaking)
│   │   └── TranscriptDisplay.tsx # Live transcript shown during voice mode
│   ├── location/
│   │   ├── NearbyAlert.tsx     # Proactive suggestion slide-up overlay
│   │   ├── NearbyList.tsx      # "What's nearby?" full results view
│   │   └── LocationPermission.tsx # Permission request with explanation
│   └── auth/
│       └── AuthScreen.tsx      # Login / Register / Guest
├── screens/
│   ├── HomeScreen.tsx
│   ├── PlanningScreen.tsx
│   ├── CalendarScreen.tsx
│   ├── BudgetScreen.tsx
│   ├── MemoryScreen.tsx
│   └── ProfileScreen.tsx
├── lib/
│   ├── db.ts                   # Dexie.js IndexedDB setup + schema
│   ├── buddy-engine.ts         # LLM orchestration (Claude + offline fallback)
│   ├── constraint-solver.ts    # Deterministic trip optimisation
│   ├── signals.ts              # Implicit signal detection logic
│   ├── currency.ts             # Exchange rate fetching + conversion
│   ├── mapbox.ts               # Mapbox helpers
│   ├── cost-data.ts            # Static cost-of-living dataset
│   ├── voice.ts                # STT (Web Speech API / Deepgram) + TTS (ElevenLabs) orchestration
│   ├── location.ts             # Geolocation polling, POI matching, alert throttling
│   └── nearby.ts               # Foursquare/Mapbox POI fetch + preference filtering
├── stores/
│   ├── tripStore.ts            # Zustand store for trips
│   ├── budgetStore.ts          # Expense tracking state
│   ├── calendarStore.ts        # Calendar events state
│   ├── buddyStore.ts           # Buddy mood, position, conversation
│   └── userStore.ts            # Auth state, preferences, travel profile
├── types/
│   └── index.ts                # TypeScript type definitions
└── assets/
    └── mood-references/      # Reference videos only (not used in production)
        ├── idle.mp4           # Documents idle animation intent
        ├── thinking.mp4       # Documents thinking animation intent
        └── goulding.mp4       # Documents excited animation intent
    # NOTE: Production Buddy is a live Spline scene loaded via URL/embed.
    # No .mp4 or .png files of Buddy are rendered in the app.
```

---

## 17. Figma Reference

| Screen | Figma Node ID | File Key |
|--------|--------------|----------|
| Home with Buddy Dock | `4:2` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Budget Health | `4:148` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Onboarding (Login/Register) | `4:321` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Calendar (Sanctuary Schedule) | `4:355` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Planning Studio | `4:508` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Your Footprints (Memory) | `4:684` | `V79v5dnXk5UNNBZP4Ld9AS` |
| Bottom Nav Bar | `4:811` | `V79v5dnXk5UNNBZP4Ld9AS` |
