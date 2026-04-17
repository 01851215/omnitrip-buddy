import { supabase } from "./supabase";

export async function seedSupabaseData(userId: string, displayName: string) {
  const now = Date.now();

  // Check if already seeded
  const { data: existingTrips } = await supabase.from("trips").select("id").eq("user_id", userId).limit(1);
  if (existingTrips && existingTrips.length > 0) return;

  // Active Trip: Bali
  const { data: baliTrip } = await supabase.from("trips").insert({
    user_id: userId,
    title: "Bali Spiritual Escape",
    status: "active",
    start_date: "2026-03-22",
    end_date: "2026-04-01",
    cover_image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    description: "A 10-day journey through Bali's temples, rice terraces, and coastal villages.",
  }).select("id").single();

  const baliId = baliTrip!.id;

  // Destinations
  const { data: destinations } = await supabase.from("destinations").insert([
    {
      trip_id: baliId, name: "Ubud", country: "Indonesia",
      lat: -8.5069, lng: 115.2625, arrival_date: "2026-03-22", departure_date: "2026-03-26",
      timezone: "Asia/Makassar", cover_image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80",
    },
    {
      trip_id: baliId, name: "Seminyak", country: "Indonesia",
      lat: -8.6913, lng: 115.1683, arrival_date: "2026-03-26", departure_date: "2026-04-01",
      timezone: "Asia/Makassar", cover_image: "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&q=80",
    },
  ]).select("id, name");

  const ubudId = destinations?.find((d) => d.name === "Ubud")?.id;
  const seminyakId = destinations?.find((d) => d.name === "Seminyak")?.id;

  // Budget
  await supabase.from("budgets").insert({
    trip_id: baliId, total_planned_amount: 3200, total_planned_currency: "USD",
    currency: "USD", daily_target_amount: 320, daily_target_currency: "USD",
  });

  // Expenses
  await supabase.from("expenses").insert([
    { trip_id: baliId, amount: 45, currency: "USD", converted_amount: 45, category: "food", description: "Warung Babi Guling", location: "Ubud", timestamp: now - 4 * 86400000, buddy_suggested: false },
    { trip_id: baliId, amount: 120, currency: "USD", converted_amount: 120, category: "stays", description: "Jungle Villa (2 nights)", location: "Ubud", timestamp: now - 4 * 86400000, buddy_suggested: false },
    { trip_id: baliId, amount: 35, currency: "USD", converted_amount: 35, category: "experiences", description: "Rice Terrace Walk", location: "Tegallalang", timestamp: now - 3 * 86400000, buddy_suggested: true },
    { trip_id: baliId, amount: 180, currency: "USD", converted_amount: 180, category: "experiences", description: "Artisanal Ceramics Workshop", location: "Ubud", timestamp: now - 2 * 86400000, buddy_suggested: false },
    { trip_id: baliId, amount: 12, currency: "USD", converted_amount: 12, category: "transport", description: "Scooter rental (1 day)", location: "Ubud", timestamp: now - 2 * 86400000, buddy_suggested: false },
    { trip_id: baliId, amount: 28, currency: "USD", converted_amount: 28, category: "food", description: "Sunset dinner at Locavore", location: "Ubud", timestamp: now - 1 * 86400000, buddy_suggested: true },
    { trip_id: baliId, amount: 550, currency: "USD", converted_amount: 550, category: "stays", description: "Beach Resort (5 nights)", location: "Seminyak", timestamp: now, buddy_suggested: false },
    { trip_id: baliId, amount: 15, currency: "USD", converted_amount: 15, category: "food", description: "Morning smoothie bowl", location: "Seminyak", timestamp: now, buddy_suggested: false },
  ]);

  // Calendar Events
  await supabase.from("calendar_events").insert([
    { user_id: userId, trip_id: baliId, source: "omnitrip", title: "Flight BA2490", description: "Heathrow (LHR) → Lisbon (LIS)", start_time: "2026-03-26T09:00:00", end_time: "2026-03-26T12:00:00", type: "travel", conflicts_with: ["cal-002"], buddy_resolution: "Best time to move Flight BA2490 to 07:00 to avoid your Project Sync." },
    { user_id: userId, source: "google_calendar", title: "Project Sync", description: "Zoom Call", start_time: "2026-03-26T09:30:00", end_time: "2026-03-26T10:30:00", type: "personal", conflicts_with: ["cal-001"] },
    { user_id: userId, trip_id: baliId, source: "omnitrip", title: "Temple Visit — Tirta Empul", start_time: "2026-03-26T14:00:00", end_time: "2026-03-26T16:00:00", type: "travel", conflicts_with: [] },
  ]);

  // Trip Days + Activities for Ubud (4 days)
  const ubudDays = [
    { trip_id: baliId, date: "2026-03-22", buddy_notes: ["Arrive and settle in. Take it easy."], energy_level: "low" },
    { trip_id: baliId, date: "2026-03-23", buddy_notes: ["Great day for temple exploration."], energy_level: "high" },
    { trip_id: baliId, date: "2026-03-24", buddy_notes: ["Rice terraces in the morning, workshop afternoon."], energy_level: "medium" },
    { trip_id: baliId, date: "2026-03-25", buddy_notes: ["Last day in Ubud. Pack and relax."], energy_level: "low" },
  ];
  const { data: insertedUbudDays } = await supabase.from("trip_days").insert(ubudDays).select("id, date");

  if (insertedUbudDays && ubudId) {
    const dayMap = Object.fromEntries(insertedUbudDays.map((d) => [d.date, d.id]));
    await supabase.from("activities").insert([
      { trip_day_id: dayMap["2026-03-22"], trip_id: baliId, destination_id: ubudId, title: "Airport Transfer", type: "transport", start_time: "2026-03-22T14:00", end_time: "2026-03-22T16:00", location_name: "Ngurah Rai Airport", status: "completed", sort_order: 0 },
      { trip_day_id: dayMap["2026-03-22"], trip_id: baliId, destination_id: ubudId, title: "Check into Jungle Villa", type: "accommodation", start_time: "2026-03-22T16:30", end_time: "2026-03-22T17:00", location_name: "Ubud Jungle Villa", status: "completed", sort_order: 1 },
      { trip_day_id: dayMap["2026-03-22"], trip_id: baliId, destination_id: ubudId, title: "Dinner at Warung Babi Guling", type: "food", start_time: "2026-03-22T19:00", end_time: "2026-03-22T20:30", location_name: "Warung Babi Guling Ibu Oka", status: "completed", sort_order: 2, estimated_cost_amount: 45 },
      { trip_day_id: dayMap["2026-03-23"], trip_id: baliId, destination_id: ubudId, title: "Tirta Empul Temple", type: "experience", start_time: "2026-03-23T08:00", end_time: "2026-03-23T11:00", location_name: "Tirta Empul", status: "completed", sort_order: 0, buddy_suggested: true },
      { trip_day_id: dayMap["2026-03-23"], trip_id: baliId, destination_id: ubudId, title: "Lunch at local warung", type: "food", start_time: "2026-03-23T12:00", end_time: "2026-03-23T13:00", location_name: "Warung Tepi Sawah", status: "completed", sort_order: 1, estimated_cost_amount: 12 },
      { trip_day_id: dayMap["2026-03-23"], trip_id: baliId, destination_id: ubudId, title: "Monkey Forest Walk", type: "experience", start_time: "2026-03-23T15:00", end_time: "2026-03-23T17:00", location_name: "Sacred Monkey Forest", status: "completed", sort_order: 2 },
      { trip_day_id: dayMap["2026-03-24"], trip_id: baliId, destination_id: ubudId, title: "Tegallalang Rice Terrace", type: "experience", start_time: "2026-03-24T07:00", end_time: "2026-03-24T10:00", location_name: "Tegallalang", status: "completed", sort_order: 0, estimated_cost_amount: 35, buddy_suggested: true },
      { trip_day_id: dayMap["2026-03-24"], trip_id: baliId, destination_id: ubudId, title: "Ceramics Workshop", type: "experience", start_time: "2026-03-24T14:00", end_time: "2026-03-24T17:00", location_name: "Ubud Artisan Studio", status: "planned", sort_order: 1, estimated_cost_amount: 180 },
      { trip_day_id: dayMap["2026-03-24"], trip_id: baliId, destination_id: ubudId, title: "Sunset dinner at Locavore", type: "food", start_time: "2026-03-24T18:30", end_time: "2026-03-24T20:30", location_name: "Locavore", status: "planned", sort_order: 2, estimated_cost_amount: 28, buddy_suggested: true },
      { trip_day_id: dayMap["2026-03-25"], trip_id: baliId, destination_id: ubudId, title: "Morning yoga", type: "rest", start_time: "2026-03-25T07:00", end_time: "2026-03-25T08:30", location_name: "Yoga Barn Ubud", status: "planned", sort_order: 0 },
      { trip_day_id: dayMap["2026-03-25"], trip_id: baliId, destination_id: ubudId, title: "Pack & transfer to Seminyak", type: "transport", start_time: "2026-03-25T14:00", end_time: "2026-03-25T16:00", location_name: "Ubud → Seminyak", status: "planned", sort_order: 1 },
    ]);
  }

  // Seminyak days
  const seminyakDays = [
    { trip_id: baliId, date: "2026-03-26", buddy_notes: ["Beach day. Settle into resort."], energy_level: "medium" },
    { trip_id: baliId, date: "2026-03-27", buddy_notes: ["Explore the beach clubs and shops."], energy_level: "high" },
    { trip_id: baliId, date: "2026-03-28", buddy_notes: ["Spa day. You deserve it."], energy_level: "low" },
    { trip_id: baliId, date: "2026-03-29", buddy_notes: ["Surf lesson or chill — your call."], energy_level: "medium" },
    { trip_id: baliId, date: "2026-03-30", buddy_notes: ["Final sunset. Make it count."], energy_level: "medium" },
  ];
  const { data: insertedSemDays } = await supabase.from("trip_days").insert(seminyakDays).select("id, date");

  if (insertedSemDays && seminyakId) {
    const dayMap = Object.fromEntries(insertedSemDays.map((d) => [d.date, d.id]));
    await supabase.from("activities").insert([
      { trip_day_id: dayMap["2026-03-26"], trip_id: baliId, destination_id: seminyakId, title: "Check into Beach Resort", type: "accommodation", start_time: "2026-03-26T16:00", end_time: "2026-03-26T17:00", location_name: "The Legian Seminyak", status: "planned", sort_order: 0 },
      { trip_day_id: dayMap["2026-03-26"], trip_id: baliId, destination_id: seminyakId, title: "Sunset at Ku De Ta", type: "food", start_time: "2026-03-26T18:00", end_time: "2026-03-26T20:00", location_name: "Ku De Ta", status: "planned", sort_order: 1, estimated_cost_amount: 60 },
      { trip_day_id: dayMap["2026-03-27"], trip_id: baliId, destination_id: seminyakId, title: "Morning beach walk", type: "rest", start_time: "2026-03-27T07:00", end_time: "2026-03-27T08:30", location_name: "Seminyak Beach", status: "planned", sort_order: 0 },
      { trip_day_id: dayMap["2026-03-27"], trip_id: baliId, destination_id: seminyakId, title: "Explore boutique shops", type: "experience", start_time: "2026-03-27T10:00", end_time: "2026-03-27T13:00", location_name: "Jl. Kayu Aya", status: "planned", sort_order: 1 },
      { trip_day_id: dayMap["2026-03-28"], trip_id: baliId, destination_id: seminyakId, title: "Balinese spa treatment", type: "rest", start_time: "2026-03-28T10:00", end_time: "2026-03-28T12:00", location_name: "Spring Spa", status: "planned", sort_order: 0, estimated_cost_amount: 85, buddy_suggested: true },
      { trip_day_id: dayMap["2026-03-29"], trip_id: baliId, destination_id: seminyakId, title: "Surf lesson", type: "experience", start_time: "2026-03-29T09:00", end_time: "2026-03-29T11:00", location_name: "Double Six Beach", status: "planned", sort_order: 0, estimated_cost_amount: 40 },
      { trip_day_id: dayMap["2026-03-30"], trip_id: baliId, destination_id: seminyakId, title: "Final sunset dinner", type: "food", start_time: "2026-03-30T17:30", end_time: "2026-03-30T20:00", location_name: "La Lucciola", status: "planned", sort_order: 0, estimated_cost_amount: 55 },
    ]);
  }

  // Completed Trip: Kyoto
  const { data: kyotoTrip } = await supabase.from("trips").insert({
    user_id: userId,
    title: "Kyoto Autumn Trails",
    status: "completed",
    start_date: "2025-11-01",
    end_date: "2025-11-10",
    cover_image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    description: "Exploring Kyoto's temples and autumn foliage.",
  }).select("id").single();

  const kyotoId = kyotoTrip!.id;

  await supabase.from("trip_reflections").insert({
    trip_id: kyotoId, overall_rating: 5,
    highlights: ["Fushimi Inari at sunrise", "Tea ceremony in Gion", "Bamboo grove walk"],
    buddy_insights: [
      "You spent 40% more time in natural areas than cultural sites — your pace preference is shifting toward slower, nature-led exploration.",
      "Your food spending was 30% under budget. You gravitated toward local izakayas over tourist restaurants.",
    ],
    completed_activities: 18, skipped_activities: 3, budget_accuracy: 0.87, pace_score: 0.35,
  });

  await supabase.from("journal_entries").insert([
    { trip_id: kyotoId, date: "2025-11-03", text: "Walking through Fushimi Inari at dawn. The sound of temple bells, the crunch of gravel. No one else around. This is why I travel.", photo_url: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80", location_name: "Fushimi Inari", buddy_badge: "Recommended as a personal favourite" },
    { trip_id: kyotoId, date: "2025-11-06", text: "Found a tiny izakaya near Pontocho. The owner spoke no English but somehow we communicated through gestures and smiles.", photo_url: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&q=80", location_name: "Pontocho Alley" },
  ]);

  // Travel Profile
  await supabase.from("travel_profiles").insert({
    user_id: userId,
    pace_preference: 3,
    budget_style: "moderate",
    activity_preferences: ["nature", "culture", "food", "adventure"],
    time_of_day_pattern: "morning",
    cuisine_preferences: ["Japanese", "Indonesian", "Thai", "Mediterranean"],
    avoidances: ["crowded tourist traps", "chain restaurants"],
  });

  // Dream Trips
  await supabase.from("dream_trips").insert([
    { user_id: userId, title: "Patagonia Wilderness", description: "Hiking Torres del Paine and exploring glaciers in southern Chile.", cover_image: "https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800&q=80" },
    { user_id: userId, title: "Morocco Medina Trail", description: "Wandering through Marrakech, Fes, and the Atlas Mountains.", cover_image: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80" },
    { user_id: userId, title: "Nordic Fjord Route", description: "Coastal Norway by train — Bergen to Tromsø via Lofoten.", cover_image: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80" },
  ]);

  // Upsert profile — works whether or not trigger already created the row
  await supabase.from("profiles").upsert({
    id: userId,
    email: "",
    username: displayName.toLowerCase().replace(/\s+/g, "_") || "traveller",
    display_name: displayName,
    buddy_name: "OmniBuddy",
    age: 24,
    bio: "Solo explorer chasing quiet mornings and local flavours.",
  }, { onConflict: "id" });
}
