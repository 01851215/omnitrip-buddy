/**
 * Frontend client for Supabase Edge Functions — real-time deal search + checkout.
 * Falls back to the static `generateDeals()` when Edge Functions are unavailable.
 */

import { supabase } from "./supabase";
import { generateDeals, type Deal, type DealCategory } from "./deals";

export interface LiveDeal {
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
  provider: string;
  bookable: boolean;
  affiliateUrl?: string;
  amadeusOfferId?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
}

export type LiveDealResult = Record<DealCategory, LiveDeal[]>;

interface DestinationInput {
  name: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  lat?: number;
  lng?: number;
}

/**
 * Fetches real prices from the search-deals Edge Function.
 * Falls back to static deals on failure.
 */
export async function searchDeals(
  destinations: DestinationInput[],
  originCity = "London",
): Promise<{ deals: LiveDealResult; isLive: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("search-deals", {
      body: { destinations, originCity },
    });

    if (error) throw error;

    const live = data as LiveDealResult;
    const hasAny = Object.values(live).some((arr) => arr.length > 0);

    if (hasAny) {
      return { deals: live, isLive: true };
    }
  } catch (err) {
    console.warn("Live deal search failed, falling back to static deals:", err);
  }

  // Fallback: use static deals generator and convert to LiveDeal shape
  const staticDeals = generateDeals(destinations, originCity);
  const converted = Object.fromEntries(
    Object.entries(staticDeals).map(([cat, deals]) => [
      cat,
      deals.map((d: Deal) => ({
        id: d.id,
        category: d.category,
        title: d.title,
        subtitle: d.subtitle,
        priceFrom: d.priceFrom,
        currency: d.currency,
        rating: d.rating,
        reviewCount: d.reviewCount,
        image: d.image,
        badge: d.badge,
        provider: d.affiliateLinks[0]?.provider ?? "Unknown",
        bookable: d.category === "activities",
        affiliateUrl: d.affiliateLinks[0]?.url,
        destination: d.destination,
        checkIn: d.checkIn,
        checkOut: d.checkOut,
      })),
    ]),
  ) as LiveDealResult;

  return { deals: converted, isLive: false };
}

/**
 * Creates a Stripe Checkout session for a bookable deal.
 * Returns the checkout URL to redirect the user to.
 */
export async function createCheckout(params: {
  title: string;
  priceAmount: number;
  currency: string;
  tripId?: string;
  userId: string;
  dealCategory: DealCategory;
  provider: string;
  startTime?: string;
  endTime?: string;
}): Promise<{ url: string; sessionId: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: params,
    });

    if (error) throw error;
    return data as { url: string; sessionId: string };
  } catch (err) {
    console.error("Checkout creation failed:", err);
    return null;
  }
}

/**
 * Records an external booking (user booked via affiliate link).
 */
export async function recordExternalBooking(params: {
  userId: string;
  tripId?: string;
  dealCategory: DealCategory;
  provider: string;
  title: string;
  priceAmount: number;
  currency: string;
  bookingUrl?: string;
  startTime?: string;
  endTime?: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: params.userId,
      trip_id: params.tripId ?? null,
      deal_category: params.dealCategory,
      provider: params.provider,
      title: params.title,
      price_amount: params.priceAmount,
      currency: params.currency,
      status: "external",
      booking_url: params.bookingUrl ?? null,
      start_time: params.startTime ?? null,
      end_time: params.endTime ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to record external booking:", error);
    return null;
  }
  return data.id;
}
