/**
 * Supabase table row shapes (snake_case, matching DB columns).
 * These replace `any` in mapRow.ts and hooks.
 * Regenerate with `supabase gen types typescript` when connected to a live project.
 */

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  status: "planning" | "active" | "completed";
  start_date: string;
  end_date: string;
  cover_image?: string | null;
  description?: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  converted_amount: number;
  category: string;
  description: string;
  location: string;
  timestamp: number;
  buddy_suggested: boolean;
}

export interface CalendarEventRow {
  id: string;
  user_id: string;
  trip_id?: string | null;
  source: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  type: string;
  conflicts_with: string[];
  buddy_resolution?: string | null;
}

export interface BudgetRow {
  id: string;
  trip_id: string;
  total_planned_amount: number;
  total_planned_currency: string;
  currency: string;
  daily_target_amount: number;
  daily_target_currency: string;
}

export interface JournalEntryRow {
  id: string;
  trip_id: string;
  date: string;
  text: string;
  photo_url?: string | null;
  location_name?: string | null;
  buddy_badge?: string | null;
}

export interface ReflectionRow {
  id: string;
  trip_id: string;
  overall_rating?: number | null;
  highlights: string[];
  buddy_insights: string[];
  completed_activities: number;
  skipped_activities: number;
  budget_accuracy: number;
  pace_score: number;
}

export interface DreamTripRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  cover_image?: string | null;
}

export interface DestinationRow {
  id: string;
  trip_id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  arrival_date: string;
  departure_date: string;
  timezone: string;
  cover_image?: string | null;
}

export type BookingStatus = "pending" | "confirmed" | "external" | "cancelled" | "refunded";
export type DealCategory = "flights" | "hotels" | "trains" | "activities" | "dining";

export interface BookingRow {
  id: string;
  user_id: string;
  trip_id?: string | null;
  deal_category: DealCategory;
  provider: string;
  title: string;
  price_amount: number;
  currency: string;
  status: BookingStatus;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  external_booking_ref?: string | null;
  booking_url?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
