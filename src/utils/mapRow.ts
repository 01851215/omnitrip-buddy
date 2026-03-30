import type {
  TripRow,
  ExpenseRow,
  CalendarEventRow,
  BudgetRow,
  JournalEntryRow,
  ReflectionRow,
  DreamTripRow,
  DestinationRow,
  BookingRow,
} from "../types/supabase-rows";
import type {
  Trip,
  Expense,
  CalendarEvent,
  Budget,
  JournalEntry,
  TripReflection,
  DreamTrip,
  Destination,
  Booking,
} from "../types";

export function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    coverImage: row.cover_image ?? undefined,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    amount: row.amount,
    currency: row.currency,
    convertedAmount: row.converted_amount ?? row.amount,
    category: row.category as Expense["category"],
    description: row.description,
    location: row.location,
    timestamp: row.timestamp,
    buddySuggested: row.buddy_suggested,
  };
}

export function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    tripId: row.trip_id ?? undefined,
    source: row.source as CalendarEvent["source"],
    title: row.title,
    description: row.description ?? undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    type: row.type as CalendarEvent["type"],
    conflictsWith: row.conflicts_with ?? [],
    buddyResolution: row.buddy_resolution ?? undefined,
  };
}

export function mapBudget(row: BudgetRow): Budget {
  return {
    tripId: row.trip_id,
    totalPlanned: {
      amount: row.total_planned_amount,
      currency: row.total_planned_currency,
    },
    currency: row.currency,
    dailyTarget: {
      amount: row.daily_target_amount,
      currency: row.daily_target_currency,
    },
  };
}

export function mapJournalEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    tripId: row.trip_id,
    date: row.date,
    text: row.text,
    photoUrl: row.photo_url ?? undefined,
    locationName: row.location_name ?? undefined,
    buddyBadge: row.buddy_badge ?? undefined,
  };
}

export function mapReflection(row: ReflectionRow): TripReflection {
  return {
    tripId: row.trip_id,
    overallRating: row.overall_rating ?? undefined,
    highlights: row.highlights ?? [],
    buddyInsights: row.buddy_insights ?? [],
    completedActivities: row.completed_activities,
    skippedActivities: row.skipped_activities,
    budgetAccuracy: row.budget_accuracy,
    paceScore: row.pace_score,
  };
}

export function mapDreamTrip(row: DreamTripRow): DreamTrip {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    coverImage: row.cover_image ?? undefined,
  };
}

export function mapDestination(row: DestinationRow): Destination {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    country: row.country,
    coordinates: { lat: row.lat, lng: row.lng },
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    timezone: row.timezone,
    coverImage: row.cover_image ?? undefined,
  };
}

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id ?? undefined,
    dealCategory: row.deal_category,
    provider: row.provider,
    title: row.title,
    priceAmount: row.price_amount,
    currency: row.currency,
    status: row.status,
    stripeSessionId: row.stripe_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    externalBookingRef: row.external_booking_ref ?? undefined,
    bookingUrl: row.booking_url ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: new Date(row.created_at).getTime(),
  };
}
