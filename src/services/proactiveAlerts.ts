// Proactive alert engine — smart proximity-based Buddy POI suggestions
// Only triggers when: high-confidence match + <200m + user walking (not in vehicle)

import { useLocationStore } from "../stores/locationStore";
import { fetchNearbyPOIs } from "./poi";
import { useBuddyStore } from "../stores/buddyStore";
import { generatePOINarration } from "./chatgpt";
import { speak } from "./tts";

const MAX_ALERTS_PER_HOUR = 3;
const MIN_ALERT_INTERVAL = 10 * 60 * 1000; // 10 minutes between alerts
const MAX_PROXIMITY = 200; // meters
const MAX_WALKING_SPEED = 1.5; // m/s — roughly walking pace

// High-confidence POI categories that match typical user preferences
const HIGH_CONFIDENCE_CATEGORIES = [
  "restaurant", "café", "cafe", "coffee", "ramen", "bakery", "bar",
  "temple", "museum", "gallery", "historical", "landmark", "viewpoint",
  "market", "nature", "park", "garden", "cultural site",
];

let alertCheckInterval: number | null = null;

export function startAlertEngine(): void {
  if (alertCheckInterval !== null) return;

  // Check every 2 minutes
  alertCheckInterval = window.setInterval(checkForAlerts, 2 * 60 * 1000);

  // Also check immediately
  checkForAlerts();
}

export function stopAlertEngine(): void {
  if (alertCheckInterval !== null) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
  }
}

function isHighConfidence(category: string): boolean {
  const lower = category.toLowerCase();
  return HIGH_CONFIDENCE_CATEGORIES.some((c) => lower.includes(c));
}

/** Play a subtle audio cue (short chime) */
function playAudioCue(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880; // A5
    osc.type = "sine";
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Silently fail if Web Audio not available
  }
}

async function checkForAlerts(): Promise<void> {
  const store = useLocationStore.getState();

  // Skip if quiet mode, no position, or denied permission
  if (store.quietMode || !store.lat || !store.lng || store.permission !== "granted") return;

  // Rate limit: max 3/hour, min 10min between
  const recentAlerts = store.alertHistory.length; // simplified
  if (recentAlerts >= MAX_ALERTS_PER_HOUR) return;
  if (Date.now() - store.lastAlertTime < MIN_ALERT_INTERVAL) return;

  // Smart trigger: user should be walking (or stationary), not in a vehicle
  if (store.speed !== null && store.speed > MAX_WALKING_SPEED) return;

  // Fetch nearby POIs
  const pois = await fetchNearbyPOIs(store.lat, store.lng);

  // Filter: unseen + proximity + high confidence
  const candidates = pois
    .filter((p) => !store.alertHistory.includes(p.id))
    .filter((p) => p.distance <= MAX_PROXIMITY)
    .filter((p) => isHighConfidence(p.category));

  if (candidates.length === 0) return;

  // Pick the closest one
  const best = candidates.sort((a, b) => a.distance - b.distance)[0];

  // Generate AI narration for the POI
  const narration = await generatePOINarration(
    best.name,
    best.category,
    best.distance,
  );
  best.buddyMessage = narration;

  const isHandsFree = store.handsFreeMode;

  if (isHandsFree) {
    // Hands-free mode: audio only
    playAudioCue();
    // Small delay to let the cue play
    setTimeout(async () => {
      await speak(narration);
      // Auto-dismiss in hands-free
      store.dismissAlert(best.id);
    }, 500);
  } else {
    // Visual mode: show subtle prompt + audio cue
    playAudioCue();
  }

  store.setPendingAlert(best);
  useBuddyStore.getState().setMood("excited");

  // Reset mood after 5 seconds
  setTimeout(() => {
    useBuddyStore.getState().setMood("idle");
  }, 5000);
}
