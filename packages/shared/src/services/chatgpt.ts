/**
 * OpenAI convenience wrapper — delegates to the LLMProvider abstraction.
 * API key lives server-side in the llm-proxy edge function.
 *
 * initOpenAI() is kept for backward compatibility; the key param is ignored.
 * Prefer importing openAIProvider directly for new code.
 */

import { openAIProvider, anthropicProvider, type ChatMessage } from "./llm";

// ── Backward-compat re-exports ────────────────────────────────────────────────

export type ChatRole = "system" | "user" | "assistant";
export type ChatMsg  = ChatMessage;

/** @deprecated key param is ignored — API key is server-side via llm-proxy. */
export function initOpenAI(_ignoredKey: string, model?: string): void {
  if (model) {
    // Mutate the provider's default model if a custom one is requested
    (openAIProvider as { defaultModel: string }).defaultModel = model;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function callChatGPT(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string | null> {
  return openAIProvider.chat(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    { maxTokens },
  );
}

export async function callChatGPTWithHistory(
  messages: ChatMsg[],
  maxTokens = 1024,
): Promise<string | null> {
  return openAIProvider.chat(messages, { maxTokens });
}

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

  // Claude handles evocative, personality-driven narration better than GPT
  const response = await anthropicProvider.chat(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
    { maxTokens: 150 },
  );
  return response ?? `Hey! ${poiName} is just ${distance}m away — looks like a great spot worth checking out!`;
}
