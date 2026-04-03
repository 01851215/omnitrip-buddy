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

interface DestinationInput {
  name: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
}

export function generateDeals(
  destinations: DestinationInput[],
  originCity = "London",
): Record<DealCategory, Deal[]> {
  if (destinations.length === 0) {
    return { flights: [], hotels: [], trains: [], activities: [], dining: [] };
  }

  const firstDest = destinations[0];
  const lastDest = destinations[destinations.length - 1];
  const checkin = firstDest.arrivalDate;
  const checkout = lastDest.departureDate;

  // ── Flights ──────────────────────────────────────────────────────────────
  const flights: Deal[] = [
    {
      id: "fl-1",
      category: "flights",
      title: `${originCity} → ${firstDest.name}`,
      subtitle: `Direct & connecting flights · ${firstDest.country}`,
      priceFrom: priceVariant(320, firstDest.name, 200),
      currency: "USD",
      rating: 4.3,
      reviewCount: 2840,
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80",
      badge: "Best price",
      affiliateLinks: [
        skyscannerFlight(originCity, firstDest.name, checkin, checkout),
        googleFlights(originCity, firstDest.name, checkin, checkout),
        budgetAirFlight(originCity, firstDest.name, checkin),
      ],
    },
    {
      id: "fl-2",
      category: "flights",
      title: `Budget flights to ${firstDest.name}`,
      subtitle: `Low-cost carriers · Flexible dates`,
      priceFrom: priceVariant(210, firstDest.name + "2", 150),
      currency: "USD",
      rating: 4.0,
      reviewCount: 1520,
      image: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=400&q=80",
      affiliateLinks: [
        opodoFlight(originCity, firstDest.name, checkin),
        budgetAirFlight(originCity, firstDest.name, checkin),
      ],
    },
  ];

  // ── Hotels ────────────────────────────────────────────────────────────────
  const hotels: Deal[] = destinations.flatMap((dest, di) => [
    {
      id: `ht-${di}-1`,
      category: "hotels" as DealCategory,
      title: `Hotels in ${dest.name}`,
      subtitle: `${dest.country} · ${dest.arrivalDate} – ${dest.departureDate}`,
      priceFrom: priceVariant(85, dest.name + "hotel", 60),
      currency: "USD",
      rating: 4.5,
      reviewCount: priceVariant(3200, dest.name, 1500),
      image: pickImage(getImages(dest.name), di * 2),
      badge: di === 0 ? "Top rated" : undefined,
      affiliateLinks: [
        bookingComHotel(dest.name, dest.arrivalDate, dest.departureDate),
        hotelsComHotel(dest.name, dest.arrivalDate, dest.departureDate),
      ],
    },
    {
      id: `ht-${di}-2`,
      category: "hotels" as DealCategory,
      title: `Airbnb in ${dest.name}`,
      subtitle: `Unique homes & guesthouses · ${dest.country}`,
      priceFrom: priceVariant(65, dest.name + "airbnb", 50),
      currency: "USD",
      rating: 4.7,
      reviewCount: priceVariant(1800, dest.name + "a", 900),
      image: pickImage(getImages(dest.name), di * 2 + 1),
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
      priceFrom: priceVariant(55, from.name + to.name + "train", 80),
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
      priceFrom: priceVariant(30, firstDest.name + "rail", 40),
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
  const activityTypes = [
    { label: "Top experiences", cat: undefined },
    { label: "Food & cooking tours", cat: "food" },
    { label: "Cultural & heritage", cat: "culture" },
    { label: "Adventure & outdoors", cat: "adventure" },
  ];

  const activities: Deal[] = destinations.flatMap((dest, di) =>
    activityTypes.slice(0, di === 0 ? 4 : 2).map((at, ai) => ({
      id: `act-${di}-${ai}`,
      category: "activities" as DealCategory,
      title: `${at.label} in ${dest.name}`,
      subtitle: `${dest.country} · Instant confirmation`,
      priceFrom: priceVariant(25, dest.name + at.label, 50),
      currency: "USD",
      rating: 4.6,
      reviewCount: priceVariant(890, dest.name + ai, 600),
      image: pickImage(getImages(dest.name), ai),
      badge: ai === 0 ? "Bestseller" : undefined,
      affiliateLinks: [
        viatorActivity(dest.name, at.cat),
        getYourGuideActivity(dest.name, at.cat),
        klookActivity(dest.name),
      ],
    })),
  );

  // ── Dining ────────────────────────────────────────────────────────────────
  const diningTypes = [
    { label: "Fine dining", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
    { label: "Local cuisine & street food", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80" },
    { label: "Afternoon tea & desserts", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80" },
    { label: "Rooftop bars & cocktails", img: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&q=80" },
  ];

  const dining: Deal[] = destinations.flatMap((dest, di) =>
    diningTypes.slice(0, di === 0 ? 4 : 2).map((dt, dti) => ({
      id: `din-${di}-${dti}`,
      category: "dining" as DealCategory,
      title: `${dt.label} in ${dest.name}`,
      subtitle: `${dest.country} · Reserve your table`,
      priceFrom: priceVariant(18, dest.name + dt.label, 30),
      currency: "USD",
      rating: 4.5,
      reviewCount: priceVariant(440, dest.name + dti, 300),
      image: dt.img,
      badge: dti === 2 ? "OmniBuddy pick" : undefined,
      affiliateLinks: [
        openTableDining(dest.name, dest.arrivalDate),
        theForkDining(dest.name),
        tripadvisorRestaurants(dest.name),
      ],
    })),
  );

  return { flights, hotels, trains, activities, dining };
}
