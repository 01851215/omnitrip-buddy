/**
 * Shared OpenAI ChatGPT wrapper.
 *
 * MUST call initOpenAI(apiKey) before any ChatGPT call.
 *   - apps/web/src/main.tsx    → initOpenAI(import.meta.env.VITE_OPENAI_API_KEY, import.meta.env.VITE_OPENAI_MODEL)
 *   - apps/mobile/src/setup.ts → initOpenAI(process.env.EXPO_PUBLIC_OPENAI_API_KEY!, ...)
 */

let _apiKey: string | undefined;
let _model = "gpt-5.4-mini";

const FALLBACK_MODELS = ["gpt-5.4", "gpt-4o", "gpt-4o-mini"];

export function initOpenAI(apiKey: string, model?: string): void {
  _apiKey = apiKey;
  if (model) _model = model;
}

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMsg { role: ChatRole; content: string }

export async function callChatGPT(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string | null> {
  return callChatGPTWithHistory(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    maxTokens,
  );
}

export async function callChatGPTWithHistory(
  messages: ChatMsg[],
  maxTokens = 1024,
): Promise<string | null> {
  if (!_apiKey) return null;

  async function tryWithModel(model: string): Promise<string | null> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${_apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    return (data.choices?.[0]?.message?.content as string) ?? null;
  }

  try {
    const result = await tryWithModel(_model);
    if (result) return result;

    for (const fallback of FALLBACK_MODELS) {
      if (fallback === _model) continue;
      const fbResult = await tryWithModel(fallback);
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
