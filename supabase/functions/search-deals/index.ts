import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const AMADEUS_KEY = Deno.env.get("AMADEUS_API_KEY") ?? "";
const AMADEUS_SECRET = Deno.env.get("AMADEUS_API_SECRET") ?? "";
const AMADEUS_BASE = "https://test.api.amadeus.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cached Amadeus token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string | null> {
  if (!AMADEUS_KEY || !AMADEUS_SECRET) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AMADEUS_KEY,
      client_secret: AMADEUS_SECRET,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function amadeusGet(path: string, params: Record<string, string>): Promise<unknown | null> {
  const token = await getAmadeusToken();
  if (!token) return null;

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${AMADEUS_BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn(`Amadeus ${path} failed:`, res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json();
}

interface DestinationInput {
  name: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  lat?: number;
  lng?: number;
  iataCode?: string;
}

interface DealResult {
  flights: Deal[];
  hotels: Deal[];
  trains: Deal[];
  activities: Deal[];
  dining: Deal[];
}

interface Deal {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  priceFrom: number;
  currency: string;
  rating?: number;
  reviewCount?: number;
  image: string;
  badge?: string;
  provider: string;
  bookable: boolean;
  affiliateUrl?: string;
  amadeusOfferId?: string;
}

// Resolve city to IATA code via Amadeus Location API
async function resolveIATA(city: string): Promise<string | null> {
  const data = await amadeusGet("/v1/reference-data/locations", {
    keyword: city,
    subType: "CITY,AIRPORT",
    "page[limit]": "1",
  }) as { data?: { iataCode: string }[] } | null;

  return data?.data?.[0]?.iataCode ?? null;
}

async function searchFlights(
  origin: string,
  destinations: DestinationInput[],
): Promise<Deal[]> {
  const first = destinations[0];
  const originCode = await resolveIATA(origin);
  const destCode = first.iataCode ?? (await resolveIATA(first.name));

  if (!originCode || !destCode) return [];

  const data = await amadeusGet("/v2/shopping/flight-offers", {
    originLocationCode: originCode,
    destinationLocationCode: destCode,
    departureDate: first.arrivalDate,
    adults: "1",
    max: "5",
    currencyCode: "USD",
  }) as { data?: Array<{ id: string; price: { total: string; currency: string }; itineraries: Array<{ segments: Array<{ departure: { iataCode: string }; arrival: { iataCode: string }; carrierCode: string }> }> }> } | null;

  if (!data?.data) return [];

  return data.data.map((offer, i) => {
    const seg = offer.itineraries[0]?.segments;
    const carrier = seg?.[0]?.carrierCode ?? "Unknown";
    const stops = (seg?.length ?? 1) - 1;

    return {
      id: `fl-amadeus-${offer.id}`,
      category: "flights",
      title: `${origin} → ${first.name}`,
      subtitle: `${carrier} · ${stops === 0 ? "Direct" : `${stops} stop${stops > 1 ? "s" : ""}`}`,
      priceFrom: parseFloat(offer.price.total),
      currency: offer.price.currency,
      rating: 4.2 + (i % 3) * 0.2,
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80",
      badge: i === 0 ? "Best price" : undefined,
      provider: "Amadeus",
      bookable: false,
      amadeusOfferId: offer.id,
    };
  });
}

async function searchHotels(destinations: DestinationInput[]): Promise<Deal[]> {
  const deals: Deal[] = [];

  for (const dest of destinations.slice(0, 2)) {
    const cityCode = dest.iataCode ?? (await resolveIATA(dest.name));
    if (!cityCode) continue;

    // Step 1: get hotel IDs by city
    const listData = await amadeusGet("/v1/reference-data/locations/hotels/by-city", {
      cityCode,
      radius: "20",
      radiusUnit: "KM",
      ratings: "3,4,5",
      hotelSource: "ALL",
    }) as { data?: Array<{ hotelId: string; name: string; rating?: number }> } | null;

    if (!listData?.data?.length) continue;

    const hotelIds = listData.data.slice(0, 5).map((h) => h.hotelId);

    // Step 2: get offers for those hotels
    const offersData = await amadeusGet("/v3/shopping/hotel-offers", {
      hotelIds: hotelIds.join(","),
      checkInDate: dest.arrivalDate,
      checkOutDate: dest.departureDate,
      adults: "1",
      currency: "USD",
    }) as { data?: Array<{ hotel: { name: string; hotelId: string; rating?: string }; offers: Array<{ id: string; price: { total: string; currency: string } }> }> } | null;

    if (!offersData?.data) continue;

    for (const hotel of offersData.data.slice(0, 3)) {
      const offer = hotel.offers?.[0];
      if (!offer) continue;

      deals.push({
        id: `ht-amadeus-${hotel.hotel.hotelId}`,
        category: "hotels",
        title: hotel.hotel.name || `Hotel in ${dest.name}`,
        subtitle: `${dest.country} · ${dest.arrivalDate} – ${dest.departureDate}`,
        priceFrom: parseFloat(offer.price.total),
        currency: offer.price.currency,
        rating: hotel.hotel.rating ? parseFloat(hotel.hotel.rating) : 4.0,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
        provider: "Amadeus",
        bookable: false,
        amadeusOfferId: offer.id,
      });
    }
  }

  return deals;
}

async function searchActivities(destinations: DestinationInput[]): Promise<Deal[]> {
  const deals: Deal[] = [];

  for (const dest of destinations.slice(0, 2)) {
    if (!dest.lat || !dest.lng) continue;

    const data = await amadeusGet("/v1/shopping/activities", {
      latitude: String(dest.lat),
      longitude: String(dest.lng),
      radius: "15",
    }) as { data?: Array<{ id: string; name: string; shortDescription?: string; price?: { amount: string; currencyCode: string }; rating?: string; pictures?: string[]; bookingLink?: string }> } | null;

    if (!data?.data) continue;

    for (const act of data.data.slice(0, 4)) {
      deals.push({
        id: `act-amadeus-${act.id}`,
        category: "activities",
        title: act.name,
        subtitle: act.shortDescription?.slice(0, 80) ?? `Activity in ${dest.name}`,
        priceFrom: act.price ? parseFloat(act.price.amount) : 25,
        currency: act.price?.currencyCode ?? "USD",
        rating: act.rating ? parseFloat(act.rating) : 4.5,
        image: act.pictures?.[0] ?? "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400&q=80",
        provider: "Amadeus",
        bookable: true,
        affiliateUrl: act.bookingLink,
        amadeusOfferId: act.id,
      });
    }
  }

  return deals;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destinations, originCity = "London" } = await req.json() as {
      destinations: DestinationInput[];
      originCity?: string;
    };

    if (!destinations?.length) {
      return new Response(JSON.stringify({ error: "No destinations provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run all searches in parallel
    const [flights, hotels, activities] = await Promise.all([
      searchFlights(originCity, destinations),
      searchHotels(destinations),
      searchActivities(destinations),
    ]);

    const result: DealResult = {
      flights,
      hotels,
      trains: [],
      activities,
      dining: [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-deals error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
