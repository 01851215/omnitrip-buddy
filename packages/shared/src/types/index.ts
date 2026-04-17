// ── Buddy ──────────────────────────────────────────────
export type BuddyMood = "idle" | "thinking" | "excited";
export type BuddyPosition = "center" | "sidebar";

// ── Money ──────────────────────────────────────────────
export interface Money {
  amount: number;
  currency: string; // ISO 4217
}

// ── User ───────────────────────────────────────────────
export interface User {
  id: string;
  email?: string;
  displayName: string;
  createdAt: number; // epoch ms
}

// ── Travel Profile (learned over time) ─────────────────
export interface TravelProfile {
  userId: string;
  pacePreference: number; // 0 = very relaxed, 1 = very packed
  budgetStyle: Record<ExpenseCategory, number>; // category weights
  activityPreferences: Record<string, number>;
  timeOfDayPattern: { morningActivity: number; eveningActivity: number };
  cuisinePreferences: string[];
  avoidances: string[];
  lastUpdated: number;
}

// ── Trip ───────────────────────────────────────────────
export type TripStatus = "planning" | "active" | "completed";

export interface Trip {
  id: string;
  userId: string;
  title: string;
  status: TripStatus;
  startDate: string; // ISO date
  endDate: string;
  coverImage?: string;
  description?: string;
  createdAt: number;
}

// ── Destination ────────────────────────────────────────
export interface Destination {
  id: string;
  tripId: string;
  name: string;
  country: string;
  coordinates: { lat: number; lng: number };
  arrivalDate: string;
  departureDate: string;
  timezone: string;
  coverImage?: string;
}

// ── Itinerary ──────────────────────────────────────────
export type EnergyLevel = "high" | "medium" | "low";

export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string;
  buddyNotes: string[];
  energyLevel: EnergyLevel;
}

export type ActivityType =
  | "transport"
  | "accommodation"
  | "experience"
  | "food"
  | "rest"
  | "free";

export type ActivityStatus = "planned" | "completed" | "skipped" | "modified";

export interface Activity {
  id: string;
  dayId: string;
  tripId: string;
  title: string;
  type: ActivityType;
  startTime: string; // ISO datetime
  endTime: string;
  locationName: string;
  locationCoords?: { lat: number; lng: number };
  status: ActivityStatus;
  estimatedCost?: Money;
  actualCost?: Money;
  rating?: number; // 1-5
  notes?: string;
  buddySuggested: boolean;
}

// ── Budget ─────────────────────────────────────────────
export type ExpenseCategory =
  | "stays"
  | "food"
  | "transport"
  | "experiences"
  | "essentials";

export interface Budget {
  tripId: string;
  totalPlanned: Money;
  currency: string;
  dailyTarget: Money;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  convertedAmount: number;
  category: ExpenseCategory;
  description: string;
  location: string;
  timestamp: number; // epoch ms
  buddySuggested: boolean;
}

// ── Calendar ───────────────────────────────────────────
export type CalendarEventSource = "omnitrip" | "google_calendar";
export type CalendarEventType = "travel" | "personal";

export interface CalendarEvent {
  id: string;
  tripId?: string;
  source: CalendarEventSource;
  title: string;
  description?: string;
  startTime: string; // ISO datetime
  endTime: string;
  type: CalendarEventType;
  conflictsWith: string[];
  buddyResolution?: string;
}

// ── Reflection & Memory ────────────────────────────────
export interface TripReflection {
  tripId: string;
  overallRating?: number; // 1-5
  highlights: string[];
  buddyInsights: string[];
  completedActivities: number;
  skippedActivities: number;
  budgetAccuracy: number; // planned vs actual ratio
  paceScore: number;
}

export interface JournalEntry {
  id: string;
  tripId: string;
  date: string;
  text: string;
  photoUrl?: string;
  locationName?: string;
  buddyBadge?: string;
}

// ── Dream Trip ─────────────────────────────────────────
export interface DreamTrip {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImage?: string;
}

// ── Booking ───────────────────────────────────────────
export type BookingStatus = "pending" | "confirmed" | "external" | "cancelled" | "refunded";
export type DealCategory = "flights" | "hotels" | "trains" | "activities" | "dining";

export interface Booking {
  id: string;
  userId: string;
  tripId?: string;
  dealCategory: DealCategory;
  provider: string;
  title: string;
  priceAmount: number;
  currency: string;
  status: BookingStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  externalBookingRef?: string;
  bookingUrl?: string;
  startTime?: string;
  endTime?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
}
