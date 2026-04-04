// Central OpenAI ChatGPT API wrapper

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const OPENAI_MODEL = (import.meta.env.VITE_OPENAI_MODEL as string) || "gpt-4o-mini";

async function tryModel(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}

const FALLBACK_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];

export async function callChatGPT(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const result = await tryModel(OPENAI_MODEL, systemPrompt, userMessage, maxTokens);
    if (result) return result;

    for (const fallback of FALLBACK_MODELS) {
      if (fallback === OPENAI_MODEL) continue;
      const fbResult = await tryModel(fallback, systemPrompt, userMessage, maxTokens);
      if (fbResult) return fbResult;
    }

    return null;
  } catch (err) {
    console.warn("ChatGPT API call failed:", err);
    return null;
  }
}

/**
 * Generate a contextual POI storytelling narration using ChatGPT.
 * If a personalityPrompt is provided, it overrides the default system prompt.
 */
export async function generatePOINarration(
  poiName: string,
  poiCategory: string,
  distance: number,
  userPreferences?: string,
  personalityPrompt?: string,
): Promise<string> {
  const systemPrompt = personalityPrompt ??
    `You are OmniBuddy, a warm, emotionally intelligent travel companion. Generate a short, engaging, conversational narration (2-3 sentences) about a nearby point of interest. Sound like a knowledgeable friend whispering a great tip. Be specific and evocative.`;

  const userMsg = `Nearby place: "${poiName}" (${poiCategory}), ${distance}m away.${userPreferences ? ` User preferences: ${userPreferences}` : ""} Generate a brief, enticing narration.`;

  const response = await callChatGPT(systemPrompt, userMsg, 150);
  return response ?? `Hey! ${poiName} is just ${distance}m away — looks like a great spot worth checking out!`;
}
