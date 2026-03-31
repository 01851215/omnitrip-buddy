import { callChatGPT } from "./chatgpt";
import { historyToPromptContext } from "../hooks/useUserHistory";
import type { UserHistory } from "../hooks/useUserHistory";

export interface VibeAnalysis {
  vibeLabel: string;
  vibeDescription: string;
  traits: Array<{ name: string; score: number }>;
  evolutionNarrative: string;
  topCategories: Array<{ category: string; percentage: number }>;
}

export async function generateVibeAnalysis(
  history: UserHistory,
): Promise<VibeAnalysis> {
  const context = historyToPromptContext(history);

  const systemPrompt = `You are an expert travel psychologist and data analyst. Based on a traveller's history, produce a personality analysis in strict JSON (no markdown fences).

Return this exact shape:
{
  "vibeLabel": "<catchy 2-4 word traveller archetype, e.g. 'The Mindful Wanderer'>",
  "vibeDescription": "<2-3 sentences capturing their travel personality>",
  "traits": [
    { "name": "Cultural Depth", "score": <1-5> },
    { "name": "Adventure", "score": <1-5> },
    { "name": "Food Explorer", "score": <1-5> },
    { "name": "Pace", "score": <1-5> },
    { "name": "Budget Savvy", "score": <1-5> }
  ],
  "evolutionNarrative": "<one paragraph about how their travel style has evolved>",
  "topCategories": [
    { "category": "<activity type>", "percentage": <number 0-100> }
  ]
}

topCategories should have 4-6 items summing to 100. Be creative with vibeLabel. Ground analysis in the data provided.`;

  const response = await callChatGPT(systemPrompt, context, 600);

  if (response) {
    try {
      const cleaned = response.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as VibeAnalysis;
    } catch {
      // Fall through to computed fallback
    }
  }

  return computeFallbackAnalysis(history);
}

function computeFallbackAnalysis(history: UserHistory): VibeAnalysis {
  const { activityPatterns, budgetPatterns, travelProfile, pastTrips } = history;

  const paceScore = Math.min(5, Math.max(1, Math.round(travelProfile.pace)));
  const budgetScore = budgetPatterns.budgetAccuracy <= 1.1 ? 4 : budgetPatterns.budgetAccuracy <= 1.3 ? 3 : 2;

  const hasCompleted = Object.values(activityPatterns.completedTypes).reduce((s, n) => s + n, 0) > 0;
  const completed = hasCompleted ? activityPatterns.completedTypes : (activityPatterns.plannedTypes ?? {});
  const total = Object.values(completed).reduce((s, n) => s + n, 0) || 1;

  const cultureTypes = ["cultural", "temple", "museum", "heritage", "art"];
  const adventureTypes = ["adventure", "hiking", "diving", "sport", "outdoor"];
  const foodTypes = ["food", "dining", "restaurant", "cafe", "market", "cooking"];

  const cultureScore = Math.min(5, Math.round(
    (cultureTypes.reduce((s, t) => s + (completed[t] || 0), 0) / total) * 10 + 1,
  ));
  const adventureScore = Math.min(5, Math.round(
    (adventureTypes.reduce((s, t) => s + (completed[t] || 0), 0) / total) * 10 + 1,
  ));
  const foodScore = Math.min(5, Math.round(
    (foodTypes.reduce((s, t) => s + (completed[t] || 0), 0) / total) * 10 + 1,
  ));

  const vibeLabel =
    paceScore <= 2 ? "The Slow Voyager" :
    cultureScore >= 4 ? "The Culture Seeker" :
    foodScore >= 4 ? "The Flavour Chaser" :
    adventureScore >= 4 ? "The Bold Explorer" :
    "The Curious Traveller";

  // Build category breakdown from completed activity types
  const sorted = Object.entries(completed).sort((a, b) => b[1] - a[1]);
  let remaining = 100;
  const topCategories = sorted.slice(0, 5).map(([category, count], i, arr) => {
    const pct = i < arr.length - 1
      ? Math.round((count / total) * 100)
      : remaining;
    remaining -= pct;
    return { category: category.charAt(0).toUpperCase() + category.slice(1), percentage: Math.max(0, pct) };
  });
  if (topCategories.length === 0) {
    topCategories.push({ category: "Exploration", percentage: 60 }, { category: "Dining", percentage: 40 });
  }

  return {
    vibeLabel,
    vibeDescription: `Across ${pastTrips.length} trip${pastTrips.length !== 1 ? "s" : ""}, you've shown a clear preference for ${activityPatterns.favoriteType} experiences. Your average daily spend of $${budgetPatterns.avgDailySpend} reflects a ${travelProfile.budgetStyle} approach to travel.`,
    traits: [
      { name: "Cultural Depth", score: cultureScore },
      { name: "Adventure", score: adventureScore },
      { name: "Food Explorer", score: foodScore },
      { name: "Pace", score: paceScore },
      { name: "Budget Savvy", score: budgetScore },
    ],
    evolutionNarrative: `Your journey has taken you through ${pastTrips.length} adventures so far. ${pastTrips.length > 1 ? "Each trip reveals a deeper appreciation for authentic local experiences over surface-level tourism." : "This is just the beginning of discovering your travel identity."} Your ${travelProfile.budgetStyle} budget style and love of ${travelProfile.cuisines.slice(0, 2).join(" and ") || "diverse cuisines"} paint a picture of someone who values quality over quantity.`,
    topCategories,
  };
}
