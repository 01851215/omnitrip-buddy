// Geolocation permission, polling, and speed tracking

import { useLocationStore } from "../stores/locationStore";

let watchId: number | null = null;

export function requestLocation(): void {
  if (!navigator.geolocation) {
    useLocationStore.getState().setPermission("denied");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const store = useLocationStore.getState();
      store.setPermission("granted");
      store.setPosition(pos.coords.latitude, pos.coords.longitude);
      startWatching();
    },
    (err) => {
      useLocationStore.getState().setPermission(
        err.code === err.PERMISSION_DENIED ? "denied" : "prompt"
      );
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function startWatching(): void {
  if (watchId !== null) return;

  // Use watchPosition for continuous updates (better for speed calculation)
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      useLocationStore.getState().setPosition(
        pos.coords.latitude,
        pos.coords.longitude
      );
    },
    () => {
      // Silently fail on polling errors
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    }
  );
}

export function stopPolling(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}
