// Proactive alert engine — smart proximity-based Buddy POI suggestions
// Only triggers when: high-confidence match + <200m + user walking (not in vehicle)

import { useLocationStore } from "../stores/locationStore";
import { useProfileStore } from "../stores/profileStore";
import { fetchNearbyPOIs } from "./poi";
import { useBuddyStore } from "../stores/buddyStore";
import { generatePOINarration } from "./chatgpt";
import { buildPOINarrationPrompt, type BuddyTone } from "./buddyPersonality";
import { speak } from "./tts";

const MAX_PROXIMITY = 200; // meters
const MAX_WALKING_SPEED = 1.5; // m/s — roughly walking pace

// alertFrequency 1–5 maps to these rate limits
function getAlertLimits(frequency: number) {
  const clamped = Math.max(1, Math.min(5, Math.round(frequency)));
  const maxPerHour = [1, 2, 3, 5, 8][clamped - 1];
  const minInterval = [20, 15, 10, 6, 3][clamped - 1] * 60 * 1000;
  return { maxPerHour, minInterval };
}

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

  const { maxPerHour, minInterval } = getAlertLimits(store.alertFrequency);
  const recentAlerts = store.alertHistory.length;
  if (recentAlerts >= maxPerHour) return;
  if (Date.now() - store.lastAlertTime < minInterval) return;

  // Smart trigger: user should be walking (or stationary), not in a vehicle
  if (store.speed !== null && store.speed > MAX_WALKING_SPEED) return;

  // Fetch nearby POIs — exclude demo entries (no Foursquare key)
  const pois = await fetchNearbyPOIs(store.lat, store.lng);
  const realPOIs = pois.filter((p) => !p.id.startsWith("demo-"));

  // Update the store's nearby feed with real POIs only
  store.setNearbyPOIs(realPOIs);

  // Filter: real POIs only + unseen + proximity + high confidence
  const candidates = realPOIs
    .filter((p) => !store.alertHistory.includes(p.id))
    .filter((p) => p.distance <= MAX_PROXIMITY)
    .filter((p) => isHighConfidence(p.category));

  if (candidates.length === 0) return;

  // Pick the closest one
  const best = candidates.sort((a, b) => a.distance - b.distance)[0];

  // Build personality-aware narration prompt
  const profile = useProfileStore.getState().profile;
  const travelProfile = useProfileStore.getState().travelProfile;
  const buddySettings = travelProfile?.buddySettings ?? {};
  const tone = (buddySettings as Record<string, string>).tone as BuddyTone | undefined;
  const personalityPrompt = buildPOINarrationPrompt({
    buddyName: profile?.buddyName || "OmniBuddy",
    tone: tone ?? "warm",
    history: null,
  });

  // Generate AI narration for the POI
  const narration = await generatePOINarration(
    best.name,
    best.category,
    best.distance,
    undefined,
    personalityPrompt,
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
