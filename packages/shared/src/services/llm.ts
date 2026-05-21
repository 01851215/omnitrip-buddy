/**
 * LLM provider abstraction.
 *
 * Both OpenAI and Anthropic route through the server-side llm-proxy edge function.
 * The proxy normalises all responses to OpenAI's chat-completion shape, so this
 * module only needs one HTTP implementation regardless of which provider is active.
 *
 * Usage:
 *   import { openAIProvider, anthropicProvider } from "./llm";
 *   const text = await anthropicProvider.chat([...], { maxTokens: 512 });
 */

import { supabase, getSupabaseUrl } from "./supabase";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
}

/** JSON Schema tool definition — matches OpenAI and Anthropic tool formats. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** A single tool call returned by the model. */
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** Full LLM response including optional tool calls. */
export interface LLMResponse {
  text: string | null;
  toolCalls?: ToolCall[];
}

export interface LLMProvider {
  readonly providerName: "openai" | "anthropic";
  readonly defaultModel: string;
  /**
   * Send a conversation. Returns the assistant's text, or null on failure.
   * Callers should handle null gracefully (demo fallback, retry, etc.).
   */
  chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string | null>;
  /**
   * Send a conversation with tool definitions. Returns full LLMResponse
   * including any tool calls the model chose to make.
   */
  chatWithTools(messages: ChatMessage[], tools: ToolDefinition[], opts?: LLMOptions): Promise<LLMResponse>;
}

// ── Shared proxy call ─────────────────────────────────────────────────────────

async function callProxy(
  provider: "openai" | "anthropic",
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  tools?: ToolDefinition[],
): Promise<LLMResponse> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    console.warn("LLMProvider: Supabase not initialised — call initSupabase() first.");
    return { text: null };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn("LLMProvider: No active session — user must be signed in.");
    return { text: null };
  }

  // Convert our ToolDefinition shape to the OpenAI function-calling format
  // the proxy expects (both providers accept this via the proxy).
  const formattedTools = tools?.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/llm-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        provider,
        model,
        messages,
        maxTokens,
        ...(formattedTools?.length ? { tools: formattedTools } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.warn(`llm-proxy ${provider} ${res.status}:`, err);
      return { text: null };
    }

    const data = await res.json() as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const text = data.choices?.[0]?.message?.content ?? null;
    const rawToolCalls = data.choices?.[0]?.message?.tool_calls;

    const toolCalls: ToolCall[] | undefined = rawToolCalls
      ?.map((tc) => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* keep {} */ }
        return { name: tc.function?.name ?? "", arguments: args };
      })
      .filter((tc) => tc.name.length > 0);

    return { text, toolCalls: toolCalls?.length ? toolCalls : undefined };
  } catch (err) {
    console.warn(`llm-proxy ${provider} fetch failed:`, err);
    return { text: null };
  }
}

// ── Provider factory ──────────────────────────────────────────────────────────

export function createLLMProvider(
  providerName: "openai" | "anthropic",
  defaultModel: string,
): LLMProvider {
  return {
    providerName,
    defaultModel,
    async chat(messages: ChatMessage[], opts: LLMOptions = {}): Promise<string | null> {
      const result = await callProxy(providerName, opts.model ?? defaultModel, messages, opts.maxTokens ?? 1024);
      return result.text;
    },
    async chatWithTools(
      messages: ChatMessage[],
      tools: ToolDefinition[],
      opts: LLMOptions = {},
    ): Promise<LLMResponse> {
      return callProxy(providerName, opts.model ?? defaultModel, messages, opts.maxTokens ?? 1024, tools);
    },
  };
}

// ── Named provider instances ──────────────────────────────────────────────────

/** OpenAI GPT — best for structured JSON outputs and itinerary generation. */
export const openAIProvider = createLLMProvider("openai", "gpt-5.4");

/** Anthropic Claude — best for conversational Buddy chat and narrative text. */
export const anthropicProvider = createLLMProvider("anthropic", "claude-sonnet-4-6");
