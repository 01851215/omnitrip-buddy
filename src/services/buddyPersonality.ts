/**
 * Adaptive Buddy Personality Engine
 *
 * Builds dynamic system prompts based on user profile, travel history,
 * vibe archetype, and current context. The LLM adapts its communication
 * style, vocabulary, and energy to match the user's personality.
 */

import { historyToPromptContext, type UserHistory } from "../hooks/useUserHistory";
import type { POI } from "../stores/locationStore";

export type BuddyTone = "warm" | "energetic" | "calm";

export interface PersonalityContext {
  buddyName: string;
  tone: BuddyTone;
  history: UserHistory | null;
  vibeLabel?: string;          // e.g. "The Slow Voyager"
  locationContext?: string;    // "lat, lng" or city name
  nearbyPOIs?: POI[];          // live nearby places from Foursquare / demo
  movingSpeed?: number | null; // m/s — null if unknown
  currentScreen?: string;      // "plan" | "calendar" | "home" etc.
  activeTrip?: string;         // trip title
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

const TONE_INSTRUCTIONS: Record<BuddyTone, string> = {
  warm: `Be warm, conversational, and emotionally supportive. Use gentle encouragement
("That sounds lovely", "I think you'd really enjoy..."). Speak like a caring travel companion
who genuinely cares about the user's wellbeing. Occasional soft humor.`,

  energetic: `Be upbeat, enthusiastic, and action-oriented! Use exclamation marks naturally,
express genuine excitement ("Oh, you're gonna love this!", "Let's do it!"). Speak like an
adventurous friend who's always hyped about the next discovery. High energy but not annoying.`,

  calm: `Be measured, thoughtful, and meditative. Use reflective language ("Consider...",
"You might find..."). Speak like a zen travel mentor who values mindfulness and slow travel.
Unhurried, precise, and serene. No exclamation marks.`,
};

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

const TIME_FLAVOR: Record<string, Record<BuddyTone, string>> = {
  morning: {
    warm: "It's a fresh morning — a great time to explore gently.",
    energetic: "Good morning! The day is full of possibilities!",
    calm: "The morning light is ideal for a mindful start.",
  },
  afternoon: {
    warm: "Hope you're having a lovely afternoon.",
    energetic: "Afternoon adventures await!",
    calm: "The afternoon unfolds at its own pace.",
  },
  evening: {
    warm: "Winding down for the evening — how was your day?",
    energetic: "The evening is young — still time for something fun!",
    calm: "Evening is for reflection and gentle discoveries.",
  },
  night: {
    warm: "It's getting late — hope you're somewhere comfortable.",
    energetic: "Night owl mode! Any late plans?",
    calm: "The quiet of night brings its own kind of travel.",
  },
};

/**
 * Build a context-aware, personality-adapted system prompt for ChatGPT.
 */
export function buildSystemPrompt(ctx: PersonalityContext): string {
  const time = ctx.timeOfDay ?? getTimeOfDay();
  const tone = ctx.tone ?? "warm";
  const name = ctx.buddyName || "OmniBuddy";

  const parts: string[] = [];

  // Core identity
  parts.push(
    `You are ${name}, a personal travel companion in the OmniTrip app. ` +
    `You are NOT a generic AI assistant — you are a real travel pal who knows the user personally.`,
  );

  // Tone instruction
  parts.push(TONE_INSTRUCTIONS[tone]);

  // Vibe archetype adaptation
  if (ctx.vibeLabel) {
    parts.push(
      `The user's travel personality is "${ctx.vibeLabel}". ` +
      `Adapt your suggestions and language to resonate with this archetype. ` +
      `Reference it naturally sometimes ("As a fellow wanderer..." or "For someone who loves culture like you...").`,
    );
  }

  // User history context
  if (ctx.history) {
    const histCtx = historyToPromptContext(ctx.history);
    if (histCtx) {
      parts.push(`User context: ${histCtx}`);
    }
  }

  // Location awareness
  if (ctx.locationContext) {
    parts.push(`The user is currently located near: ${ctx.locationContext}.`);
  }

  // Nearby POIs — give Buddy real places to reference
  if (ctx.nearbyPOIs && ctx.nearbyPOIs.length > 0) {
    const poiList = ctx.nearbyPOIs
      .slice(0, 5)
      .map((p) => `• ${p.name} (${p.category}, ${p.distance}m away${p.address ? ` — ${p.address}` : ""})`)
      .join("\n");
    parts.push(
      `Nearby places the user can visit right now:\n${poiList}\n` +
      `When relevant, reference these specific places by name in your suggestions instead of speaking generically.`,
    );
  }

  // Movement context — adjust suggestions based on how fast user is moving
  if (ctx.movingSpeed !== undefined && ctx.movingSpeed !== null) {
    if (ctx.movingSpeed < 0.5) {
      parts.push(`The user appears to be stationary — they may be looking for something to do nearby.`);
    } else if (ctx.movingSpeed < 1.5) {
      parts.push(`The user is walking — suggest nearby places they can reach on foot.`);
    } else if (ctx.movingSpeed < 5) {
      parts.push(`The user is moving quickly (possibly cycling or in a vehicle) — keep suggestions brief and route-aware.`);
    }
  }

  // Time awareness
  parts.push(TIME_FLAVOR[time][tone]);

  // Active trip context
  if (ctx.activeTrip) {
    parts.push(`The user is currently on a trip: "${ctx.activeTrip}".`);
  }

  // Response style
  parts.push(
    `Keep responses concise (2-3 sentences for chat, 1-2 for voice). ` +
    `Be actionable — suggest specific things, not vague ideas. ` +
    `When the user asks to do something (book, plan, navigate), confirm and act.`,
  );

  // Voice command awareness
  parts.push(
    `You can help with: planning trips, finding deals, booking hotels/flights/activities, ` +
    `checking the calendar, logging expenses, exploring nearby places, and giving personalized ` +
    `recommendations. When the user asks to perform an action, respond with a brief confirmation ` +
    `and include the action keyword in brackets at the END of your response, like: ` +
    `[ACTION:plan_trip], [ACTION:show_calendar], [ACTION:find_hotels], [ACTION:find_restaurants], ` +
    `[ACTION:find_activities], [ACTION:check_budget], [ACTION:show_deals], [ACTION:go_home], ` +
    `[ACTION:open_profile], [ACTION:show_journeys], [ACTION:find_flights], [ACTION:find_trains], ` +
    `[ACTION:nearby_food], [ACTION:nearby_things], [ACTION:hidden_gems].`,
  );

  return parts.join("\n\n");
}

/**
 * Build a POI narration prompt adapted to user personality.
 */
export function buildPOINarrationPrompt(ctx: PersonalityContext): string {
  const tone = ctx.tone ?? "warm";
  const name = ctx.buddyName || "OmniBuddy";

  const toneGuide: Record<BuddyTone, string> = {
    warm: "Sound like a friend whispering a wonderful tip. Gentle excitement.",
    energetic: "Sound thrilled about this discovery! Infectious enthusiasm.",
    calm: "Share the discovery mindfully, like a haiku about a hidden gem.",
  };

  return (
    `You are ${name}, narrating a nearby discovery for a traveler. ` +
    `${toneGuide[tone]} ` +
    `Keep it to 2 sentences. Be specific and evocative.` +
    (ctx.history
      ? ` The traveler enjoys: ${ctx.history.travelProfile.cuisines.join(", ") || "local food"} ` +
        `and avoids: ${ctx.history.travelProfile.avoidances.join(", ") || "nothing specific"}.`
      : "")
  );
}

/**
 * Extract action intent from ChatGPT response (bracketed at the end).
 */
export function extractAction(response: string): {
  text: string;
  action: string | null;
} {
  const match = response.match(/\[ACTION:(\w+)\]\s*$/);
  if (match) {
    return {
      text: response.replace(/\s*\[ACTION:\w+\]\s*$/, "").trim(),
      action: match[1],
    };
  }
  return { text: response, action: null };
}

/**
 * Map extracted action to a route or handler key.
 */
export function actionToRoute(action: string): string | null {
  const map: Record<string, string> = {
    plan_trip: "/plan",
    show_calendar: "/calendar",
    check_budget: "/budget",
    show_deals: "/plan",
    go_home: "/home",
    open_profile: "/profile",
    show_journeys: "/footprints",
    find_hotels: "/plan",
    find_flights: "/plan",
    find_trains: "/plan",
    find_restaurants: "/plan",
    find_activities: "/plan",
  };
  return map[action] ?? null;
}

/**
 * Check if an action should trigger a POI/nearby search in the BuddyPanel.
 */
export function isNearbyAction(action: string): boolean {
  return ["nearby_food", "nearby_things", "hidden_gems"].includes(action);
}
