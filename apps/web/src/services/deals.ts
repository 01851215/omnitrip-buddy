/**
 * Curated deals service — generates realistic deals for destinations.
 * Affiliate links open real provider search pages pre-filled with destination/dates.
 * No API key required; real-time search via affiliate redirect.
 */

import {
  bookingComHotel,
  airbnbHotel,
  hotelsComHotel,
  hostelworldHotel,
  skyscannerFlight,
  googleFlights,
  budgetAirFlight,
  opodoFlight,
  trainlineTrain,
  railEuropeTrain,
  viatorActivity,
  getYourGuideActivity,
  klookActivity,
  openTableDining,
  theForkDining,
  tripadvisorRestaurants,
  type AffiliateLink,
} from "./affiliateLinks";

export type DealCategory = "flights" | "hotels" | "trains" | "activities" | "dining";

export interface Deal {
  id: string;
  category: DealCategory;
  title: string;
  subtitle: string;
  priceFrom: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  image: string;
  badge?: string;
  affiliateLinks: AffiliateLink[];
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  day?: number;
  dayDate?: string;
  timeSlot?: "morning" | "afternoon" | "evening";
  timeExact?: string;
  // Flight-specific
  flightNumber?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMins?: number;
  stops?: number;
  // Hotel-specific
  hotelName?: string;
  starRating?: number;
  roomType?: string;
  amenities?: string[];
}

// Destination-specific image pool
const DESTINATION_IMAGES: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80",
    "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
  ],
  bali: [
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80",
    "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400&q=80",
    "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=400&q=80",
  ],
  japan: [
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&q=80",
    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&q=80",
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80",
  ],
  portugal: [
    "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&q=80",
    "https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?w=400&q=80",
    "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80",
  ],
  switzerland: [
    "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=400&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
    "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=400&q=80",
  ],
  morocco: [
    "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=400&q=80",
    "https://images.unsplash.com/photo-1597212720158-0ffe2e5edd45?w=400&q=80",
    "https://images.unsplash.com/photo-1560983073-c29bea4420e0?w=400&q=80",
  ],
};

function getImages(destination: string): string[] {
  const key = destination.toLowerCase();
  for (const [k, imgs] of Object.entries(DESTINATION_IMAGES)) {
    if (key.includes(k)) return imgs;
  }
  return DESTINATION_IMAGES.default;
}

function pickImage(imgs: string[], idx: number) {
  return imgs[idx % imgs.length];
}

// Randomized-feeling but deterministic price offsets
function priceVariant(base: number, seed: string, spread: number): number {
  const hash = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.round(base + (hash % spread) - spread / 2);
}

function hashInt(seed: string): number {
  return seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}
function pickPool<T>(pool: T[], seed: string): T {
  return pool[hashInt(seed) % pool.length];
}

const AIRLINE_POOL = [
  { code: "BA", name: "British Airways" },
  { code: "LH", name: "Lufthansa" },
  { code: "AF", name: "Air France" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
  { code: "JL", name: "Japan Airlines" },
  { code: "NH", name: "ANA" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "KL", name: "KLM" },
  { code: "CX", name: "Cathay Pacific" },
  { code: "VS", name: "Virgin Atlantic" },
];

const HOTEL_BRANDS = {
  budget:   ["Ibis", "Premier Inn", "Travelodge", "ibis budget", "Pod Hotel", "Motel One"],
  moderate: ["Marriott", "Hilton", "Novotel", "Radisson Blu", "Crowne Plaza", "Sheraton", "Hyatt Regency"],
  luxury:   ["Four Seasons", "Ritz-Carlton", "Park Hyatt", "Mandarin Oriental", "St. Regis", "Bulgari Hotel"],
};
const ROOM_TYPES = {
  budget:   ["Standard Room", "Economy Twin", "Budget Double"],
  moderate: ["Deluxe Double", "Superior King", "Comfort Twin", "Classic Room"],
  luxury:   ["Junior Suite", "Deluxe Ocean View", "Premier Suite", "Club Room"],
};
const AMENITIES_POOL = {
  budget:   [["Free WiFi", "24hr Reception"], ["Free WiFi", "Luggage Storage"], ["Free WiFi", "Self-catering"]],
  moderate: [["Free WiFi", "Pool", "Gym"], ["Free WiFi", "Breakfast", "Pool"], ["Free WiFi", "Gym", "Restaurant"]],
  luxury:   [["Free WiFi", "Spa", "Pool", "Concierge"], ["Free WiFi", "Rooftop Pool", "Fine Dining"], ["Free WiFi", "Infinity Pool", "Spa", "Room Service"]],
};

function budgetTier(dailyBudget?: number): "budget" | "moderate" | "luxury" {
  if (!dailyBudget || dailyBudget <= 80) return "budget";
  if (dailyBudget <= 200) return "moderate";
  return "luxury";
}

// Scale base prices to match the user's daily budget tier
function getPriceMultiplier(dailyBudget: number): number {
  if (dailyBudget <= 50)  return 0.45; // ~$144 flights, ~$38/night hotels
  if (dailyBudget <= 80)  return 0.60; // ~$192 flights, ~$51/night hotels
  if (dailyBudget <= 150) return 1.00; // ~$320 flights, ~$85/night hotels
  if (dailyBudget <= 250) return 1.50; // ~$480 flights, ~$128/night hotels
  return 2.20;                          // ~$704 flights, ~$187/night hotels
}

interface DestinationInput {
  name: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
}

export function generateDeals(
  destinations: DestinationInput[],
  originCity = "London",
  dailyBudget?: number,
): Record<DealCategory, Deal[]> {
  if (destinations.length === 0) {
    return { flights: [], hotels: [], trains: [], activities: [], dining: [] };
  }

  const m = dailyBudget ? getPriceMultiplier(dailyBudget) : 1.0;
  const p = (base: number, seed: string, spread: number) =>
    priceVariant(Math.round(base * m), seed, Math.max(2, Math.round(spread * m)));

  const firstDest = destinations[0];
  const lastDest = destinations[destinations.length - 1];
  const checkin = firstDest.arrivalDate;
  const checkout = lastDest.departureDate;
  const tier = budgetTier(dailyBudget);

  // ── Flight helpers ────────────────────────────────────────────────────────
  function makeFlightTimes(seed: string, durationHrBase: number) {
    const h = hashInt(seed);
    const depHour = 6 + (h % 7);               // 06:00 – 12:00
    const depMin  = (h % 4) * 15;              // :00 :15 :30 :45
    const durMins = (durationHrBase + (h % 4)) * 60 + (h % 60);
    const arrTotalMin = depHour * 60 + depMin + durMins;
    const arrHour = Math.floor(arrTotalMin / 60) % 24;
    const arrMin  = arrTotalMin % 60;
    const fmt = (hh: number, mm: number) =>
      `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    return { depTime: fmt(depHour, depMin), arrTime: fmt(arrHour, arrMin), durMins };
  }

  const al1 = pickPool(AIRLINE_POOL, firstDest.name);
  const al2 = pickPool(AIRLINE_POOL, firstDest.name + "2");
  const fl1Times = makeFlightTimes(firstDest.name, 5);
  const fl2Times = makeFlightTimes(firstDest.name + "2", 4);
  const fn1 = `${al1.code}${100 + (hashInt(firstDest.name) % 800)}`;
  const fn2 = `${al2.code}${100 + (hashInt(firstDest.name + "2") % 800)}`;

  // ── Flights ──────────────────────────────────────────────────────────────
  const flights: Deal[] = [
    {
      id: "fl-1",
      category: "flights",
      title: `${originCity} → ${firstDest.name}`,
      subtitle: `${al1.name} · Direct · ${Math.floor(fl1Times.durMins / 60)}h ${fl1Times.durMins % 60}m`,
      priceFrom: p(320, firstDest.name, 200),
      currency: "USD",
      rating: 4.3,
      reviewCount: 2840,
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80",
      badge: "Best price",
      flightNumber: fn1,
      airline: al1.name,
      departureTime: fl1Times.depTime,
      arrivalTime: fl1Times.arrTime,
      durationMins: fl1Times.durMins,
      stops: 0,
      affiliateLinks: [
        googleFlights(originCity, firstDest.name, checkin, checkout),
        skyscannerFlight(originCity, firstDest.name, checkin, checkout),
        budgetAirFlight(originCity, firstDest.name, checkin),
      ],
    },
    {
      id: "fl-2",
      category: "flights",
      title: `${originCity} → ${firstDest.name}`,
      subtitle: `${al2.name} · 1 stop · ${Math.floor(fl2Times.durMins / 60)}h ${fl2Times.durMins % 60}m`,
      priceFrom: p(210, firstDest.name + "2", 150),
      currency: "USD",
      rating: 4.0,
      reviewCount: 1520,
      image: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=400&q=80",
      flightNumber: fn2,
      airline: al2.name,
      departureTime: fl2Times.depTime,
      arrivalTime: fl2Times.arrTime,
      durationMins: fl2Times.durMins,
      stops: 1,
      affiliateLinks: [
        googleFlights(originCity, firstDest.name, checkin),
        opodoFlight(originCity, firstDest.name, checkin),
        budgetAirFlight(originCity, firstDest.name, checkin),
      ],
    },
  ];

  // ── Hotels ────────────────────────────────────────────────────────────────
  const hotels: Deal[] = destinations.flatMap((dest, di) => [
    (() => {
      const brand = pickPool(HOTEL_BRANDS[tier], dest.name + "hotel");
      const hotelName = `${brand} ${dest.name}`;
      const roomType = pickPool(ROOM_TYPES[tier], dest.name + "room");
      const amenities = pickPool(AMENITIES_POOL[tier], dest.name + "amenities");
      const stars = tier === "budget" ? 3 : tier === "moderate" ? 4 : 5;
      return {
        id: `ht-${di}-1`,
        category: "hotels" as DealCategory,
        title: hotelName,
        subtitle: `${roomType} · ${dest.country}`,
        priceFrom: p(85, dest.name + "hotel", 60),
        currency: "USD",
        rating: 4.5,
        reviewCount: priceVariant(3200, dest.name, 1500),
        image: pickImage(getImages(dest.name), di * 2),
        badge: di === 0 ? "Top rated" : undefined,
        destination: dest.name,
        checkIn: dest.arrivalDate,
        checkOut: dest.departureDate,
        hotelName,
        starRating: stars,
        roomType,
        amenities,
        affiliateLinks: [
          bookingComHotel(dest.name, dest.arrivalDate, dest.departureDate),
          hotelsComHotel(dest.name, dest.arrivalDate, dest.departureDate),
        ],
      };
    })(),
    {
      id: `ht-${di}-2`,
      category: "hotels" as DealCategory,
      title: `Airbnb in ${dest.name}`,
      subtitle: `Unique homes & guesthouses · ${dest.country}`,
      priceFrom: p(65, dest.name + "airbnb", 50),
      currency: "USD",
      rating: 4.7,
      reviewCount: priceVariant(1800, dest.name + "a", 900),
      image: pickImage(getImages(dest.name), di * 2 + 1),
      destination: dest.name,
      checkIn: dest.arrivalDate,
      checkOut: dest.departureDate,
      roomType: "Private Room",
      amenities: ["Free WiFi", "Self-catering", "Washer"],
      affiliateLinks: [
        airbnbHotel(dest.name, dest.arrivalDate, dest.departureDate),
        hostelworldHotel(dest.name, dest.arrivalDate, dest.departureDate),
      ],
    },
  ]);

  // ── Trains ────────────────────────────────────────────────────────────────
  const trains: Deal[] = [];
  for (let i = 0; i < destinations.length - 1; i++) {
    const from = destinations[i];
    const to = destinations[i + 1];
    trains.push({
      id: `tr-${i}`,
      category: "trains",
      title: `${from.name} → ${to.name} by rail`,
      subtitle: `Scenic train · ${from.departureDate}`,
      priceFrom: p(55, from.name + to.name + "train", 80),
      currency: "USD",
      rating: 4.4,
      reviewCount: priceVariant(620, from.name, 400),
      image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&q=80",
      badge: "Scenic route",
      affiliateLinks: [
        trainlineTrain(from.name, to.name, from.departureDate),
        railEuropeTrain(from.name, to.name, from.departureDate),
      ],
    });
  }
  // If only one destination (no inter-legs), add a generic rail search
  if (trains.length === 0) {
    trains.push({
      id: "tr-0",
      category: "trains",
      title: `Trains around ${firstDest.name}`,
      subtitle: `Regional rail passes & day trips`,
      priceFrom: p(30, firstDest.name + "rail", 40),
      currency: "USD",
      rating: 4.2,
      reviewCount: 310,
      image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=400&q=80",
      affiliateLinks: [
        trainlineTrain(originCity, firstDest.name, checkin),
        railEuropeTrain(originCity, firstDest.name, checkin),
      ],
    });
  }

  // ── Activities ────────────────────────────────────────────────────────────
  // Pool of 8 activity slots — 4 per day max, cycling through time slots
  const ACTIVITY_POOL = [
    { label: "Top experiences",        cat: undefined,   timeSlot: "morning"   as const, timeExact: "9:00 AM"  },
    { label: "Cultural & heritage",    cat: "culture",   timeSlot: "afternoon" as const, timeExact: "2:00 PM"  },
    { label: "Food & cooking tours",   cat: "food",      timeSlot: "afternoon" as const, timeExact: "12:30 PM" },
    { label: "Night market & local life", cat: "food",   timeSlot: "evening"   as const, timeExact: "7:00 PM"  },
    { label: "Adventure & outdoors",   cat: "adventure", timeSlot: "morning"   as const, timeExact: "8:00 AM"  },
    { label: "City walking tour",      cat: undefined,   timeSlot: "morning"   as const, timeExact: "10:00 AM" },
    { label: "Photography & viewpoints", cat: undefined, timeSlot: "afternoon" as const, timeExact: "3:30 PM"  },
    { label: "Wellness & spa",         cat: undefined,   timeSlot: "evening"   as const, timeExact: "6:00 PM"  },
  ];

  const activities: Deal[] = destinations.flatMap((dest, di) => {
    const numDays = Math.max(1, Math.round(
      (new Date(dest.departureDate).getTime() - new Date(dest.arrivalDate).getTime()) / 86400000,
    ));
    const count = Math.min(di === 0 ? numDays * 4 : numDays * 2, ACTIVITY_POOL.length);
    return ACTIVITY_POOL.slice(0, count).map((at, ai) => {
      const dayNum = Math.floor(ai / 4) + 1;
      const d = new Date(dest.arrivalDate);
      d.setDate(d.getDate() + (dayNum - 1));
      return {
        id: `act-${di}-${ai}`,
        category: "activities" as DealCategory,
        title: `${at.label} in ${dest.name}`,
        subtitle: `${dest.country} · Instant confirmation`,
        priceFrom: p(25, dest.name + at.label, 50),
        currency: "USD",
        rating: 4.6,
        reviewCount: priceVariant(890, dest.name + ai, 600),
        image: pickImage(getImages(dest.name), ai),
        badge: ai === 0 ? "Bestseller" : undefined,
        destination: dest.name,
        checkIn: dest.arrivalDate,
        checkOut: dest.departureDate,
        day: dayNum,
        dayDate: d.toISOString().split("T")[0],
        timeSlot: at.timeSlot,
        timeExact: at.timeExact,
        affiliateLinks: [
          viatorActivity(dest.name, at.cat),
          getYourGuideActivity(dest.name, at.cat),
          klookActivity(dest.name),
        ],
      };
    });
  });

  // ── Dining ────────────────────────────────────────────────────────────────
  const DINING_POOL = [
    { label: "Local cuisine & street food", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", timeSlot: "afternoon" as const, timeExact: "12:30 PM" },
    { label: "Fine dining",                 img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80", timeSlot: "evening"   as const, timeExact: "7:00 PM"  },
    { label: "Afternoon tea & desserts",    img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80", timeSlot: "afternoon" as const, timeExact: "3:00 PM"  },
    { label: "Rooftop bars & cocktails",    img: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80", timeSlot: "evening"   as const, timeExact: "8:30 PM"  },
    { label: "Breakfast cafe",              img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80", timeSlot: "morning"   as const, timeExact: "8:30 AM"  },
    { label: "Night market eats",           img: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80", timeSlot: "evening"   as const, timeExact: "6:30 PM"  },
  ];

  const dining: Deal[] = destinations.flatMap((dest, di) => {
    const numDays = Math.max(1, Math.round(
      (new Date(dest.departureDate).getTime() - new Date(dest.arrivalDate).getTime()) / 86400000,
    ));
    const count = Math.min(di === 0 ? numDays * 3 : numDays * 2, DINING_POOL.length);
    return DINING_POOL.slice(0, count).map((dt, dti) => {
      const dayNum = Math.floor(dti / 3) + 1;
      const d = new Date(dest.arrivalDate);
      d.setDate(d.getDate() + (dayNum - 1));
      return {
        id: `din-${di}-${dti}`,
        category: "dining" as DealCategory,
        title: `${dt.label} in ${dest.name}`,
        subtitle: `${dest.country} · Reserve your table`,
        priceFrom: p(18, dest.name + dt.label, 30),
        currency: "USD",
        rating: 4.5,
        reviewCount: priceVariant(440, dest.name + dti, 300),
        image: dt.img,
        badge: dti === 2 ? "OmniBuddy pick" : undefined,
        destination: dest.name,
        checkIn: dest.arrivalDate,
        checkOut: dest.departureDate,
        day: dayNum,
        dayDate: d.toISOString().split("T")[0],
        timeSlot: dt.timeSlot,
        timeExact: dt.timeExact,
        affiliateLinks: [
          openTableDining(dest.name, dest.arrivalDate),
          theForkDining(dest.name),
          tripadvisorRestaurants(dest.name),
        ],
      };
    });
  });

  return { flights, hotels, trains, activities, dining };
}
