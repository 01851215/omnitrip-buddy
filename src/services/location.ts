import { useLocationStore } from "../stores/locationStore";

let watchId: number | null = null;

export async function checkLocationPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (!navigator.geolocation) return "denied";

  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state as "granted" | "denied" | "prompt";
    }
  } catch {
    // permissions API not supported — fall through
  }
  return "prompt";
}

export async function initLocationPermission(): Promise<void> {
  const state = await checkLocationPermission();
  useLocationStore.getState().setPermission(state);

  if (state === "granted") {
    requestLocation();
  }
}

async function ipGeoFallback(): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return { lat: data.latitude, lng: data.longitude };
    }
  } catch {
    // IP geolocation unavailable
  }
  return null;
}

export async function requestLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) {
    useLocationStore.getState().setPermission("denied");
    return null;
  }

  // Try browser Geolocation API (high accuracy, then low accuracy)
  const browserResult = await new Promise<{ lat: number; lng: number } | "denied" | null>((resolve) => {
    function onSuccess(pos: GeolocationPosition) {
      resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve("denied");
          return;
        }
        // Retry with low accuracy and generous cache
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err2) => {
            resolve(err2.code === err2.PERMISSION_DENIED ? "denied" : null);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 },
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

  const store = useLocationStore.getState();

  if (browserResult === "denied") {
    store.setPermission("denied");
    return null;
  }

  if (browserResult) {
    store.setPermission("granted");
    store.setPosition(browserResult.lat, browserResult.lng);
    startWatching();
    return browserResult;
  }

  // Both browser attempts failed (timeout / unavailable) — try IP geolocation
  const ipResult = await ipGeoFallback();
  if (ipResult) {
    store.setPermission("granted");
    store.setPosition(ipResult.lat, ipResult.lng);
    return ipResult;
  }

  store.setPermission("prompt");
  return null;
}

function startWatching(): void {
  if (watchId !== null) return;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      useLocationStore.getState().setPosition(pos.coords.latitude, pos.coords.longitude);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  );
}

export function stopPolling(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}
