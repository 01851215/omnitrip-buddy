/**
 * Affiliate deep-link generator for travel booking providers.
 * All links pre-fill search parameters so users land on relevant results.
 */

export interface AffiliateLink {
  provider: string;
  url: string;
  logo: string; // emoji or short code used in UI
  color: string; // Tailwind bg color class
}

function fmt(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// ── Hotels ────────────────────────────────────────────────────────────────

export function bookingComHotel(
  destination: string,
  checkin: string,
  checkout: string,
  adults = 2,
): AffiliateLink {
  const params = new URLSearchParams({
    ss: destination,
    checkin: fmt(checkin),
    checkout: fmt(checkout),
    group_adults: String(adults),
    no_rooms: "1",
    selected_currency: "USD",
  });
  return {
    provider: "Booking.com",
    url: `https://www.booking.com/searchresults.html?${params}`,
    logo: "🏨",
    color: "bg-blue-50",
  };
}

export function airbnbHotel(
  destination: string,
  checkin: string,
  checkout: string,
  adults = 2,
): AffiliateLink {
  const params = new URLSearchParams({
    query: destination,
    checkin: fmt(checkin),
    checkout: fmt(checkout),
    adults: String(adults),
  });
  return {
    provider: "Airbnb",
    url: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes?${params}`,
    logo: "🏠",
    color: "bg-rose-50",
  };
}

export function hotelsComHotel(
  destination: string,
  checkin: string,
  checkout: string,
): AffiliateLink {
  const ci = fmt(checkin);
  const co = fmt(checkout);
  return {
    provider: "Hotels.com",
    url: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(destination)}&q-check-in=${ci}&q-check-out=${co}`,
    logo: "🛎",
    color: "bg-orange-50",
  };
}

export function hostelworldHotel(destination: string, checkin: string, checkout: string): AffiliateLink {
  return {
    provider: "Hostelworld",
    url: `https://www.hostelworld.com/findabed.php/ChosenCity.${encodeURIComponent(destination)}/ChosenCountry.World/from.${fmt(checkin)}/to.${fmt(checkout)}/`,
    logo: "🎒",
    color: "bg-green-50",
  };
}

// ── Flights ───────────────────────────────────────────────────────────────

export function skyscannerFlight(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
): AffiliateLink {
  const dest = destination.toLowerCase().replace(/\s+/g, "-");
  const orig = origin.toLowerCase().replace(/\s+/g, "-");
  const d = fmt(departDate).replace(/-/g, "");
  const path = returnDate
    ? `flights/${orig}/${dest}/${d}/${fmt(returnDate).replace(/-/g, "")}/`
    : `flights/${orig}/${dest}/${d}/`;
  return {
    provider: "Skyscanner",
    url: `https://www.skyscanner.net/transport/${path}`,
    logo: "✈️",
    color: "bg-sky-50",
  };
}

export function googleFlights(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
): AffiliateLink {
  const q = `${origin} to ${destination} ${fmt(departDate)}${returnDate ? ` ${fmt(returnDate)}` : ""}`;
  return {
    provider: "Google Flights",
    url: `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`,
    logo: "🔍",
    color: "bg-blue-50",
  };
}

export function budgetAirFlight(
  origin: string,
  destination: string,
  departDate: string,
): AffiliateLink {
  const params = new URLSearchParams({
    origin,
    destination,
    departure_date: fmt(departDate),
    passengers: "1",
    currency: "USD",
  });
  return {
    provider: "BudgetAir",
    url: `https://www.budgetair.com/search?${params}`,
    logo: "💸",
    color: "bg-yellow-50",
  };
}

export function opodoFlight(
  origin: string,
  destination: string,
  departDate: string,
): AffiliateLink {
  return {
    provider: "Opodo",
    url: `https://www.opodo.com/flights/${origin}-${destination}/${fmt(departDate)}/1adults/Economy/`,
    logo: "🌍",
    color: "bg-purple-50",
  };
}

// ── Trains ────────────────────────────────────────────────────────────────

export function trainlineTrain(origin: string, destination: string, date: string): AffiliateLink {
  const params = new URLSearchParams({
    origin,
    destination,
    outwardDate: fmt(date),
    outwardDateType: "departAfter",
    journeySearchType: "single",
    passengers: "1-2656928-2656928-0",
    directSearch: "false",
    selectedTab: "train",
  });
  return {
    provider: "Trainline",
    url: `https://www.thetrainline.com/book/results?${params}`,
    logo: "🚄",
    color: "bg-green-50",
  };
}

export function railEuropeTrain(origin: string, destination: string, date: string): AffiliateLink {
  return {
    provider: "Rail Europe",
    url: `https://www.raileurope.com/train-tickets/${encodeURIComponent(origin)}-to-${encodeURIComponent(destination)}?departure=${fmt(date)}`,
    logo: "🚂",
    color: "bg-red-50",
  };
}

// ── Activities ────────────────────────────────────────────────────────────

export function viatorActivity(destination: string, category?: string): AffiliateLink {
  const q = category ? `${category} in ${destination}` : destination;
  return {
    provider: "Viator",
    url: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(q)}&pid=P00005400`,
    logo: "🎭",
    color: "bg-orange-50",
  };
}

export function getYourGuideActivity(destination: string, category?: string): AffiliateLink {
  const q = category ? `${category} ${destination}` : destination;
  return {
    provider: "GetYourGuide",
    url: `https://www.getyourguide.com/s/?q=${encodeURIComponent(q)}&partner_id=omnitrip`,
    logo: "🎫",
    color: "bg-teal-50",
  };
}

export function klookActivity(destination: string): AffiliateLink {
  return {
    provider: "Klook",
    url: `https://www.klook.com/en-US/search/?keyword=${encodeURIComponent(destination)}`,
    logo: "🎡",
    color: "bg-red-50",
  };
}

// ── Dining ────────────────────────────────────────────────────────────────

export function openTableDining(destination: string, date: string, time = "19:00"): AffiliateLink {
  const params = new URLSearchParams({
    covers: "2",
    dateTime: `${fmt(date)} ${time}`,
    term: destination,
  });
  return {
    provider: "OpenTable",
    url: `https://www.opentable.com/s/?${params}`,
    logo: "🍽",
    color: "bg-red-50",
  };
}

export function theForkDining(destination: string): AffiliateLink {
  return {
    provider: "TheFork",
    url: `https://www.thefork.com/search#city=${encodeURIComponent(destination)}`,
    logo: "🍴",
    color: "bg-green-50",
  };
}

export function tripadvisorRestaurants(destination: string): AffiliateLink {
  return {
    provider: "Tripadvisor",
    url: `https://www.tripadvisor.com/Restaurants-g${encodeURIComponent(destination)}.html`,
    logo: "⭐",
    color: "bg-green-50",
  };
}
