import { templates, type Template } from "../data/templates";
import { callChatGPT } from "./chatgpt";

// ── Types ──────────────────────────────────────────────

export interface GeneratedDestination {
  name: string;
  country: string;
  days: number;
  lat: number;
  lng: number;
  timezone: string;
  coverImage: string;
  activities: Array<{ title: string; type: string; estimatedCost: number }>;
}

export interface RouteSuggestion {
  id: string;
  title: string;
  description: string;
  duration: string;
  image: string;
  recommended: boolean;
  budget: string;
  templateId: string;
  generatedData?: {
    destinations: GeneratedDestination[];
    totalBudget: number;
    duration: number;
  };
}

export interface TripSuggestionResult {
  routes: RouteSuggestion[];
  insight: {
    text: string;
    reasons: string[];
  };
}

export interface PlanningConstraints {
  budget?: number;
  startDate?: string;
  endDate?: string;
  intensity?: "relaxed" | "balanced" | "packed";
  userHistoryContext?: string;
}

export interface BuddyResponse {
  text: string;
  suggestions?: string[];
}

// ── Image helper ──────────────────────────────────────

/** Curated Unsplash photos for common destinations — guaranteed to load */
const DESTINATION_IMAGES: Record<string, string> = {
  lisbon: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80",
  portugal: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  france: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  japan: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
  iceland: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80",
  italy: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80",
  spain: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=800&q=80",
  new_york: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  thailand: "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
  greece: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80",
  santorini: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80",
  berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=800&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  morocco: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
  marrakech: "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=800&q=80",
  switzerland: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&q=80",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80",
  cairo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=800&q=80",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
  vienna: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=800&q=80",
  prague: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&q=80",
  seoul: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&q=80",
  mexico: "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=800&q=80",
  peru: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
  india: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
};

const FALLBACK_TRAVEL_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80";

/** Get a reliable Unsplash image for a destination name */
function unsplashImage(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z\s]/g, "");
  for (const [key, url] of Object.entries(DESTINATION_IMAGES)) {
    if (lower.includes(key.replace("_", " ")) || lower.includes(key)) return url;
  }
  return FALLBACK_TRAVEL_IMAGE;
}

// ── Helpers ────────────────────────────────────────────

function matchTemplates(query: string, tpls: Template[]): Template[] {
  const q = query.toLowerCase();
  const scored = tpls.map((t) => {
    let score = 0;
    const haystack = [
      t.title,
      t.description,
      ...t.tags,
      ...t.destinations.map((d) => d.name),
      ...t.destinations.map((d) => d.country),
    ]
      .join(" ")
      .toLowerCase();
    const words = q.split(/\s+/);
    for (const w of words) {
      if (haystack.includes(w)) score += 1;
    }
    return { template: t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top matches; if nothing matched well, return top 2 anyway
  const top = scored.filter((s) => s.score > 0).slice(0, 3);
  if (top.length === 0) return scored.slice(0, 2).map((s) => s.template);
  return top.map((s) => s.template);
}

function templateToRoute(
  t: Template,
  index: number,
): RouteSuggestion {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    duration: `${t.duration} Days`,
    image: t.coverImage,
    recommended: index === 0,
    budget: `$${t.totalBudget.toLocaleString()}`,
    templateId: t.id,
  };
}

// ── Public API ─────────────────────────────────────────

export async function generateTripSuggestions(
  query: string,
  tpls: Template[] = templates,
  constraints?: PlanningConstraints,
): Promise<TripSuggestionResult> {
  const matched = matchTemplates(query, tpls);

  // Build context from matching templates (as inspiration, not constraint)
  const templateContext = matched
    .map(
      (t) =>
        `- ${t.id}: "${t.title}" (${t.duration} days, $${t.totalBudget}) — destinations: ${t.destinations.map((d) => d.name).join(", ")}`,
    )
    .join("\n");

  // Build constraint instructions
  const constraintLines: string[] = [];
  if (constraints?.budget) constraintLines.push(`- Total budget: $${constraints.budget}. Stay within this budget.`);
  if (constraints?.startDate && constraints?.endDate) {
    const start = new Date(constraints.startDate);
    const end = new Date(constraints.endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    constraintLines.push(`- Travel dates: ${constraints.startDate} to ${constraints.endDate} (${days} days). Duration MUST be exactly ${days} days.`);
  } else if (constraints?.startDate) {
    constraintLines.push(`- Start date: ${constraints.startDate}.`);
  }
  if (constraints?.intensity) {
    const actPerDay = constraints.intensity === "relaxed" ? "2-3" : constraints.intensity === "packed" ? "5-6" : "3-4";
    constraintLines.push(`- Intensity: ${constraints.intensity} (${actPerDay} activities per day). Adjust the number of activities accordingly.`);
  }

  const constraintBlock = constraintLines.length > 0
    ? `\n\nUser constraints (MUST respect these):\n${constraintLines.join("\n")}`
    : "";

  const personalizationBlock = constraints?.userHistoryContext
    ? `\n\nUser travel history (personalize based on this — lean into their preferences, avoid what they skip):\n${constraints.userHistoryContext}`
    : "";

  const systemPrompt = `You are OmniBuddy, an AI travel planner for the OmniTrip app. Given a user's travel query, generate 2-3 trip route suggestions as JSON.

You can generate custom trips for ANY destination worldwide — you are NOT limited to the templates provided. Templates are just inspiration; feel free to create entirely new routes.${constraintBlock}${personalizationBlock}

Return a JSON object (no markdown fences) with:
{
  "routes": [
    {
      "id": "gen-<slug>",
      "title": "Short catchy route title",
      "description": "1-2 sentences personalised to the query and user preferences",
      "recommended": true/false (true for best match, only one),
      "destinations": [
        {
          "name": "City Name",
          "country": "Country",
          "days": 3,
          "lat": 48.8566,
          "lng": 2.3522,
          "timezone": "Europe/Paris",
          "activities": [
            { "title": "Activity Name", "type": "experience|food|rest|transport|accommodation|free", "estimatedCost": 30 }
          ]
        }
      ],
      "totalBudget": 2500,
      "duration": 7,
      "templateId": "template-id-if-matches-exactly OR empty string if custom"
    }
  ],
  "insight": {
    "text": "1-2 sentences explaining your reasoning, referencing user preferences if available",
    "reasons": ["reason 1", "reason 2", "reason 3"]
  }
}

Rules:
- Each destination should have activities matching the intensity level (default 3-4/day if not specified)
- Use real, accurate lat/lng coordinates
- Use real IANA timezone strings
- Budget should respect the user's constraint; if none given, estimate realistically
- Duration should match dates if provided, otherwise match the query (e.g., "3 days" = 3)
- If a template closely matches, you may reference its templateId; otherwise use an empty string
- If user history shows preferences (e.g. loves food, skips museums), prioritize accordingly
- Generate 2-3 routes with different styles when possible`;

  const userMsg = `Query: "${query}"

Available templates for reference (use as inspiration, not constraint):
${templateContext}`;

  const response = await callChatGPT(systemPrompt, userMsg, 2048);

  if (response) {
    try {
      // Strip markdown fences if present
      const cleaned = response.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      const routes: RouteSuggestion[] = (parsed.routes ?? []).map(
        (r: any, i: number) => {
          // Check if this route maps to an existing template
          const matchedTpl = r.templateId
            ? matched.find((t) => t.id === r.templateId)
            : undefined;

          const destinations: GeneratedDestination[] = (r.destinations ?? []).map(
            (d: any) => ({
              name: d.name ?? "Unknown",
              country: d.country ?? "",
              days: d.days ?? 1,
              lat: d.lat ?? 0,
              lng: d.lng ?? 0,
              timezone: d.timezone ?? "UTC",
              coverImage: unsplashImage(d.name || d.country || "travel"),
              activities: (d.activities ?? []).map((a: any) => ({
                title: a.title ?? "Activity",
                type: a.type ?? "experience",
                estimatedCost: a.estimatedCost ?? 0,
              })),
            }),
          );

          const totalBudget = r.totalBudget ?? 0;
          const duration = r.duration ?? destinations.reduce((s: number, d: GeneratedDestination) => s + d.days, 0);

          return {
            id: r.id ?? `gen-${i}`,
            title: r.title ?? "Custom Trip",
            description: r.description ?? "",
            duration: `${duration} Days`,
            image:
              matchedTpl?.coverImage ??
              unsplashImage(r.title || destinations[0]?.name || "travel"),
            recommended: r.recommended ?? i === 0,
            budget: `$${totalBudget.toLocaleString()}`,
            templateId: matchedTpl ? matchedTpl.id : (r.templateId || ""),
            generatedData: {
              destinations,
              totalBudget,
              duration,
            },
          } satisfies RouteSuggestion;
        },
      );

      return {
        routes: routes.length > 0 ? routes : matched.map(templateToRoute),
        insight: parsed.insight ?? demoInsightForQuery(query),
      };
    } catch {
      // Fall through to demo mode
    }
  }

  // Demo fallback — keyword matching
  return {
    routes: matched.map(templateToRoute),
    insight: demoInsightForQuery(query),
  };
}

export async function generateBuddyResponse(
  message: string,
  context?: string,
): Promise<BuddyResponse> {
  const systemPrompt = `You are OmniBuddy, a friendly AI travel companion in the OmniTrip app. Keep answers concise (2-3 sentences max). Be warm, helpful, and knowledgeable about travel.${context ? `\n\nContext: ${context}` : ""}`;

  const response = await callChatGPT(systemPrompt, message);

  if (response) {
    return { text: response };
  }

  // Demo fallback
  const q = message.toLowerCase();
  if (q.includes("budget") || q.includes("cost") || q.includes("money")) {
    return {
      text: "Based on your travel style, I'd suggest budgeting around $150-250 per day. That covers comfortable mid-range stays, great local food, and a few signature experiences.",
      suggestions: ["Show me budget tips", "Break down costs by category"],
    };
  }
  if (q.includes("pack") || q.includes("bring") || q.includes("wear")) {
    return {
      text: "Pack light layers you can mix and match. A good pair of walking shoes is non-negotiable. I'd also suggest a packable rain jacket — weather can be unpredictable.",
      suggestions: ["Create a packing list", "Check weather forecast"],
    };
  }
  return {
    text: "That's a great question! I'd love to help you plan the perfect trip. Tell me more about what kind of experience you're looking for — adventure, relaxation, culture, or a mix of everything?",
    suggestions: ["Show me destinations", "Help me plan a trip"],
  };
}

// ── Demo insight generator ─────────────────────────────

function demoInsightForQuery(query: string): {
  text: string;
  reasons: string[];
} {
  const q = query.toLowerCase();

  if (q.includes("swiss") || q.includes("alp") || q.includes("mountain")) {
    return {
      text: "I kept the Alpine route light to give you breathing room. Since mountain weather can shift quickly, I've built in flexible days you can use for hiking or cosy chalet downtime.",
      reasons: [
        "Matches your pace + scenic preferences",
        "Climate-aligned for mountain travel",
        "Flexible itinerary for weather changes",
      ],
    };
  }
  if (q.includes("japan") || q.includes("tokyo") || q.includes("kyoto")) {
    return {
      text: "Japan is best experienced slowly. I've balanced high-energy Tokyo days with quieter Kyoto mornings so you won't burn out. The bullet train connections keep transit effortless.",
      reasons: [
        "Paced for energy — busy city then calm temples",
        "Optimised train routes between cities",
        "Cuisine highlights matched to each region",
      ],
    };
  }
  if (q.includes("portugal") || q.includes("lisbon") || q.includes("coastal")) {
    return {
      text: "Portugal's coast is perfect for a road trip at your own pace. I've routed south through the Algarve before heading north to Porto — the scenery gets more dramatic as you go.",
      reasons: [
        "South-to-north route maximises coastal views",
        "Budget-friendly with great local food",
        "Driving distances kept under 3 hours",
      ],
    };
  }
  if (q.includes("morocco") || q.includes("medina") || q.includes("desert")) {
    return {
      text: "Morocco rewards the curious traveller. I've woven together medina exploration, desert stillness, and mountain freshness — each segment is a different sensory world.",
      reasons: [
        "Three distinct landscapes in one trip",
        "Budget-optimised with local riads",
        "Cultural immersion through food and craft",
      ],
    };
  }

  return {
    text: "I've selected routes that balance discovery with downtime, matching what feels right for your travel style. Each suggestion prioritises authentic local experiences over tourist hotspots.",
    reasons: [
      "Matches your pace + high-level preferences",
      "Climate-aligned for the season",
      "Solo-friendly with flexible scheduling",
    ],
  };
}
