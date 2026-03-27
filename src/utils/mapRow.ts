// Maps Supabase snake_case rows to camelCase for compatibility with existing screen code

export function mapTrip(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    userId: row.user_id ?? row.userId,
    title: row.title,
    status: row.status,
    startDate: row.start_date ?? row.startDate,
    endDate: row.end_date ?? row.endDate,
    coverImage: row.cover_image ?? row.coverImage,
    description: row.description,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : row.createdAt,
  };
}

export function mapExpense(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    tripId: row.trip_id ?? row.tripId,
    amount: row.amount,
    currency: row.currency,
    convertedAmount: row.converted_amount ?? row.convertedAmount ?? row.amount,
    category: row.category,
    description: row.description,
    location: row.location,
    timestamp: row.timestamp,
    buddySuggested: row.buddy_suggested ?? row.buddySuggested,
  };
}

export function mapCalendarEvent(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    tripId: row.trip_id ?? row.tripId,
    source: row.source,
    title: row.title,
    description: row.description,
    startTime: row.start_time ?? row.startTime,
    endTime: row.end_time ?? row.endTime,
    type: row.type,
    conflictsWith: row.conflicts_with ?? row.conflictsWith ?? [],
    buddyResolution: row.buddy_resolution ?? row.buddyResolution,
  };
}

export function mapBudget(row: any) {
  if (!row) return row;
  return {
    ...row,
    tripId: row.trip_id ?? row.tripId,
    totalPlanned: {
      amount: row.total_planned_amount ?? row.totalPlanned?.amount,
      currency: row.total_planned_currency ?? row.totalPlanned?.currency ?? "USD",
    },
    currency: row.currency,
    dailyTarget: {
      amount: row.daily_target_amount ?? row.dailyTarget?.amount,
      currency: row.daily_target_currency ?? row.dailyTarget?.currency ?? "USD",
    },
  };
}

export function mapJournalEntry(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    tripId: row.trip_id ?? row.tripId,
    date: row.date,
    text: row.text,
    photoUrl: row.photo_url ?? row.photoUrl,
    locationName: row.location_name ?? row.locationName,
    buddyBadge: row.buddy_badge ?? row.buddyBadge,
  };
}

export function mapReflection(row: any) {
  if (!row) return row;
  return {
    ...row,
    tripId: row.trip_id ?? row.tripId,
    overallRating: row.overall_rating ?? row.overallRating,
    highlights: row.highlights ?? [],
    buddyInsights: row.buddy_insights ?? row.buddyInsights ?? [],
    completedActivities: row.completed_activities ?? row.completedActivities,
    skippedActivities: row.skipped_activities ?? row.skippedActivities,
    budgetAccuracy: row.budget_accuracy ?? row.budgetAccuracy,
    paceScore: row.pace_score ?? row.paceScore,
  };
}

export function mapDreamTrip(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    userId: row.user_id ?? row.userId,
    title: row.title,
    description: row.description,
    coverImage: row.cover_image ?? row.coverImage,
  };
}

export function mapDestination(row: any) {
  if (!row) return row;
  return {
    ...row,
    id: row.id,
    tripId: row.trip_id ?? row.tripId,
    name: row.name,
    country: row.country,
    coordinates: { lat: row.lat ?? row.coordinates?.lat, lng: row.lng ?? row.coordinates?.lng },
    arrivalDate: row.arrival_date ?? row.arrivalDate,
    departureDate: row.departure_date ?? row.departureDate,
    timezone: row.timezone,
    coverImage: row.cover_image ?? row.coverImage,
  };
}
