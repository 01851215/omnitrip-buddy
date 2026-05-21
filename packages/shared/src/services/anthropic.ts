/**
 * Anthropic Claude convenience wrapper.
 * Routes through the server-side llm-proxy edge function — no API key in the client.
 *
 * Use callClaude() for conversational responses (Buddy chat, POI narrations).
 * Use openAIProvider (chatgpt.ts) for structured JSON outputs (itinerary generation).
 */

import { anthropicProvider } from "./llm";
import type { ChatMessage, ToolDefinition, LLMResponse } from "./llm";

export { anthropicProvider };
export type { ToolDefinition, LLMResponse };

// ── Convenience functions ─────────────────────────────────────────────────────

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<string | null> {
  return anthropicProvider.chat(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    { maxTokens },
  );
}

export async function callClaudeWithHistory(
  messages: ChatMessage[],
  maxTokens = 1024,
): Promise<string | null> {
  return anthropicProvider.chat(messages, { maxTokens });
}

/** callClaude variant that passes tool definitions so the model can call tools. */
export async function callClaudeWithTools(
  systemPrompt: string,
  userMessage: string,
  tools: ToolDefinition[],
  maxTokens = 1024,
): Promise<LLMResponse> {
  return anthropicProvider.chatWithTools(
    [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    tools,
    { maxTokens },
  );
}

/** callClaudeWithHistory variant with tool support (for multi-turn conversations). */
export async function callClaudeHistoryWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  maxTokens = 1024,
): Promise<LLMResponse> {
  return anthropicProvider.chatWithTools(messages, tools, { maxTokens });
}
