import { db } from "./index";

const USER_ID = "user-sarah-001";
const ACTIVE_TRIP_ID = "trip-bali-001";
const COMPLETED_TRIP_ID = "trip-kyoto-001";

export async function seedDatabase() {
  const existingUser = await db.users.get(USER_ID);
  if (existingUser) return; // already seeded

  // ── User ──
  await db.users.add({
    id: USER_ID,
    displayName: "Sarah",
    email: "sarah@example.com",
    createdAt: Date.now(),
  });

  // ── Active Trip: Bali ──
  await db.trips.add({
    id: ACTIVE_TRIP_ID,
    userId: USER_ID,
    title: "Bali Spiritual Escape",
    status: "active",
    startDate: "2026-03-22",
    endDate: "2026-04-01",
    coverImage: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    description: "A 10-day journey through Bali's temples, rice terraces, and coastal villages.",
    createdAt: Date.now() - 7 * 86400000,
  });

  await db.destinations.bulkAdd([
    {
      id: "dest-ubud",
      tripId: ACTIVE_TRIP_ID,
      name: "Ubud",
      country: "Indonesia",
      coordinates: { lat: -8.5069, lng: 115.2625 },
      arrivalDate: "2026-03-22",
      departureDate: "2026-03-26",
      timezone: "Asia/Makassar",
    },
    {
      id: "dest-seminyak",
      tripId: ACTIVE_TRIP_ID,
      name: "Seminyak",
      country: "Indonesia",
      coordinates: { lat: -8.6913, lng: 115.1683 },
      arrivalDate: "2026-03-26",
      departureDate: "2026-04-01",
      timezone: "Asia/Makassar",
    },
  ]);

  // ── Budget ──
  await db.budgets.add({
    tripId: ACTIVE_TRIP_ID,
    totalPlanned: { amount: 3200, currency: "USD" },
    currency: "USD",
    dailyTarget: { amount: 320, currency: "USD" },
  });

  // ── Expenses ──
  const now = Date.now();
  await db.expenses.bulkAdd([
    { id: "exp-001", tripId: ACTIVE_TRIP_ID, amount: 45, currency: "USD", convertedAmount: 45, category: "food", description: "Warung Babi Guling", location: "Ubud", timestamp: now - 4 * 86400000, buddySuggested: false },
    { id: "exp-002", tripId: ACTIVE_TRIP_ID, amount: 120, currency: "USD", convertedAmount: 120, category: "stays", description: "Jungle Villa (2 nights)", location: "Ubud", timestamp: now - 4 * 86400000, buddySuggested: false },
    { id: "exp-003", tripId: ACTIVE_TRIP_ID, amount: 35, currency: "USD", convertedAmount: 35, category: "experiences", description: "Rice Terrace Walk", location: "Tegallalang", timestamp: now - 3 * 86400000, buddySuggested: true },
    { id: "exp-004", tripId: ACTIVE_TRIP_ID, amount: 180, currency: "USD", convertedAmount: 180, category: "experiences", description: "Artisanal Ceramics Workshop", location: "Ubud", timestamp: now - 2 * 86400000, buddySuggested: false },
    { id: "exp-005", tripId: ACTIVE_TRIP_ID, amount: 12, currency: "USD", convertedAmount: 12, category: "transport", description: "Scooter rental (1 day)", location: "Ubud", timestamp: now - 2 * 86400000, buddySuggested: false },
    { id: "exp-006", tripId: ACTIVE_TRIP_ID, amount: 28, currency: "USD", convertedAmount: 28, category: "food", description: "Sunset dinner at Locavore", location: "Ubud", timestamp: now - 1 * 86400000, buddySuggested: true },
    { id: "exp-007", tripId: ACTIVE_TRIP_ID, amount: 550, currency: "USD", convertedAmount: 550, category: "stays", description: "Beach Resort (5 nights)", location: "Seminyak", timestamp: now, buddySuggested: false },
    { id: "exp-008", tripId: ACTIVE_TRIP_ID, amount: 15, currency: "USD", convertedAmount: 15, category: "food", description: "Morning smoothie bowl", location: "Seminyak", timestamp: now, buddySuggested: false },
  ]);

  // ── Calendar Events ──
  await db.calendarEvents.bulkAdd([
    {
      id: "cal-001",
      tripId: ACTIVE_TRIP_ID,
      source: "omnitrip",
      title: "Flight BA2490",
      description: "Heathrow (LHR) → Lisbon (LIS)",
      startTime: "2026-03-26T09:00:00",
      endTime: "2026-03-26T12:00:00",
      type: "travel",
      conflictsWith: ["cal-002"],
      buddyResolution: "Best time to move Flight BA2490 to 07:00 to avoid your Project Sync.",
    },
    {
      id: "cal-002",
      source: "google_calendar",
      title: "Project Sync",
      description: "Zoom Call",
      startTime: "2026-03-26T09:30:00",
      endTime: "2026-03-26T10:30:00",
      type: "personal",
      conflictsWith: ["cal-001"],
    },
    {
      id: "cal-003",
      tripId: ACTIVE_TRIP_ID,
      source: "omnitrip",
      title: "Temple Visit — Tirta Empul",
      startTime: "2026-03-26T14:00:00",
      endTime: "2026-03-26T16:00:00",
      type: "travel",
      conflictsWith: [],
    },
  ]);

  // ── Completed Trip: Kyoto ──
  await db.trips.add({
    id: COMPLETED_TRIP_ID,
    userId: USER_ID,
    title: "Kyoto Autumn Trails",
    status: "completed",
    startDate: "2025-11-01",
    endDate: "2025-11-10",
    coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    description: "Exploring Kyoto's temples and autumn foliage.",
    createdAt: Date.now() - 140 * 86400000,
  });

  await db.tripReflections.add({
    tripId: COMPLETED_TRIP_ID,
    overallRating: 5,
    highlights: ["Fushimi Inari at sunrise", "Tea ceremony in Gion", "Bamboo grove walk"],
    buddyInsights: [
      "You spent 40% more time in natural areas than cultural sites — your pace preference is shifting toward slower, nature-led exploration.",
      "Your food spending was 30% under budget. You gravitated toward local izakayas over tourist restaurants.",
    ],
    completedActivities: 18,
    skippedActivities: 3,
    budgetAccuracy: 0.87,
    paceScore: 0.35,
  });

  await db.journalEntries.bulkAdd([
    {
      id: "journal-001",
      tripId: COMPLETED_TRIP_ID,
      date: "2025-11-03",
      text: "Walking through Fushimi Inari at dawn. The sound of temple bells, the crunch of gravel. No one else around. This is why I travel.",
      photoUrl: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&q=80",
      locationName: "Fushimi Inari",
      buddyBadge: "Recommended as a personal favourite",
    },
    {
      id: "journal-002",
      tripId: COMPLETED_TRIP_ID,
      date: "2025-11-06",
      text: "Found a tiny izakaya near Pontocho. The owner spoke no English but somehow we communicated through gestures and smiles.",
      photoUrl: "https://images.unsplash.com/photo-1554797589-7241bb691973?w=800&q=80",
      locationName: "Pontocho Alley",
    },
  ]);

  // ── Travel Profile ──
  await db.travelProfiles.add({
    userId: USER_ID,
    pacePreference: 0.35,
    budgetStyle: { stays: 0.4, food: 0.25, transport: 0.1, experiences: 0.2, essentials: 0.05 },
    activityPreferences: { nature: 0.8, culture: 0.7, food: 0.6, nightlife: 0.2, adventure: 0.5 },
    timeOfDayPattern: { morningActivity: 0.7, eveningActivity: 0.3 },
    cuisinePreferences: ["Japanese", "Indonesian", "Thai", "Mediterranean"],
    avoidances: ["crowded tourist traps", "chain restaurants"],
    lastUpdated: Date.now(),
  });

  // ── Dream Trips ──
  await db.dreamTrips.bulkAdd([
    {
      id: "dream-001",
      userId: USER_ID,
      title: "Patagonia Wilderness",
      description: "Hiking Torres del Paine and exploring glaciers in southern Chile.",
      coverImage: "https://images.unsplash.com/photo-1531761535209-180857e963b9?w=800&q=80",
    },
    {
      id: "dream-002",
      userId: USER_ID,
      title: "Morocco Medina Trail",
      description: "Wandering through Marrakech, Fes, and the Atlas Mountains.",
      coverImage: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    },
    {
      id: "dream-003",
      userId: USER_ID,
      title: "Nordic Fjord Route",
      description: "Coastal Norway by train — Bergen to Tromsø via Lofoten.",
      coverImage: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80",
    },
  ]);
}
