/**
 * Reverse geocode lat/lng to a human-readable place name using
 * Nominatim (OpenStreetMap) — free, no API key required.
 * Returns e.g. "Wembley, London" or "Ubud, Bali".
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12`,
      {
        headers: { "Accept-Language": "en", "User-Agent": "OmniTrip/1.0" },
        signal: controller.signal,
      },
    ).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const data = await res.json() as { address?: Record<string, string>; display_name?: string };
    const a = data.address ?? {};
    // Build "Neighbourhood, City" or "Town, Country"
    const parts = [
      a.suburb || a.neighbourhood || a.quarter || a.village || a.town,
      a.city || a.county || a.state,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 2).join(",").trim() ?? null;
  } catch {
    return null;
  }
}
