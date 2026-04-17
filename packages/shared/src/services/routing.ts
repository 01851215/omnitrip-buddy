/**
 * OSRM routing service — fetches real road-following routes.
 *
 * NOTE: The free OSRM demo server only supports "driving" profile.
 * We always fetch driving geometry (road-following polyline) and then
 * calculate realistic durations ourselves based on mode-specific speeds.
 */

export type TransportMode = "foot" | "bike" | "car";

export interface RouteResult {
  /** Decoded polyline coordinates following real roads */
  geometry: [number, number][];
  /** Total distance in meters */
  distance: number;
  /** Duration for each mode in seconds */
  durations: Record<TransportMode, number>;
  /** Recommended mode based on distance */
  recommendedMode: TransportMode;
  /** Human-readable summary per mode */
  summaries: Record<TransportMode, string>;
}

// Average speeds in m/s
const SPEED: Record<TransportMode, number> = {
  foot: 1.4,  // ~5 km/h walking
  bike: 4.2,  // ~15 km/h cycling
  car: 8.3,   // ~30 km/h urban driving (accounts for traffic/lights)
};

function formatSummary(distance: number, durationSec: number, mode: TransportMode): string {
  const distStr = distance >= 1000
    ? `${(distance / 1000).toFixed(1)} km`
    : `${Math.round(distance)} m`;
  const durMin = Math.max(1, Math.round(durationSec / 60));
  const modeLabel = mode === "foot" ? "walk" : mode === "bike" ? "cycle" : "drive";
  return `${distStr} \u00b7 ~${durMin} min ${modeLabel}`;
}

/**
 * Pick the best transport mode based on distance.
 * < 1.5 km  → walk
 * < 5 km    → bike (or walk if user prefers)
 * >= 5 km   → car/transit
 */
function recommendMode(distance: number): TransportMode {
  if (distance < 1500) return "foot";
  if (distance < 5000) return "bike";
  return "car";
}

/**
 * Fetch a real route from OSRM between waypoints.
 * Always uses "driving" profile for the road geometry, then calculates
 * realistic durations for all transport modes.
 */
export async function fetchRoute(
  waypoints: { lat: number; lng: number }[],
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  // Always use driving profile — it's the only one on the free OSRM server
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const geometry: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]], // GeoJSON [lng, lat] → Leaflet [lat, lng]
    );

    const distance: number = route.distance; // meters

    // Calculate realistic durations for each mode
    const durations: Record<TransportMode, number> = {
      foot: distance / SPEED.foot,
      bike: distance / SPEED.bike,
      car: distance / SPEED.car,
    };

    const recommendedMode = recommendMode(distance);

    const summaries: Record<TransportMode, string> = {
      foot: formatSummary(distance, durations.foot, "foot"),
      bike: formatSummary(distance, durations.bike, "bike"),
      car: formatSummary(distance, durations.car, "car"),
    };

    return { geometry, distance, durations, recommendedMode, summaries };
  } catch {
    return null;
  }
}

/**
 * Guess the user's preferred transport mode from message text.
 */
export function guessTransportMode(text: string): TransportMode | null {
  const lower = text.toLowerCase();
  if (/\b(driv|car|taxi|uber|grab|cab)\b/.test(lower)) return "car";
  if (/\b(cycl|bike|bicycle)\b/.test(lower)) return "bike";
  if (/\b(walk|foot|stroll|hike)\b/.test(lower)) return "foot";
  return null; // let the router decide
}
