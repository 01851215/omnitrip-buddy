import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const OPENAI_API_KEY    = Deno.env.get("OPENAI_API_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Sliding-window rate limit: max tokens (in + out) per user per hour
const RATE_LIMIT_TOKENS_PER_HOUR = 200_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const admin  = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

async function isWithinRateLimit(userId: string): Promise<boolean> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const since = new Date(Date.now() - 3_600_000).toISOString();

  const { data } = await admin
    .from("llm_usage")
    .select("tokens_in, tokens_out")
    .eq("user_id", userId)
    .gte("ts", since);

  const used = (data ?? []).reduce(
    (sum, row) => sum + (row.tokens_in ?? 0) + (row.tokens_out ?? 0),
    0,
  );
  return used < RATE_LIMIT_TOKENS_PER_HOUR;
}

async function recordUsage(
  userId: string,
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  await admin.from("llm_usage").insert({
    user_id: userId, provider, model, tokens_in: tokensIn, tokens_out: tokensOut,
  });
}

// ── Request body type ─────────────────────────────────────────────────────────

interface ProxyRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  messages: Array<{ role: string; content: string }>;
  tools?: unknown[];
  maxTokens?: number;
}

// ── Providers ─────────────────────────────────────────────────────────────────

async function callOpenAI(
  body: ProxyRequest,
  userId: string,
): Promise<Response> {
  if (!OPENAI_API_KEY) return json({ error: "OpenAI not configured" }, 503);

  const model = body.model ?? "gpt-4o-mini";
  const payload: Record<string, unknown> = {
    model,
    max_tokens: body.maxTokens ?? 1024,
    messages: body.messages,
  };
  if (body.tools?.length) payload.tools = body.tools;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("OpenAI error:", res.status, err);
    return json({ error: "OpenAI request failed", detail: err }, 502);
  }

  const data = await res.json();
  const usage = data.usage ?? {};
  await recordUsage(userId, "openai", model, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0);

  // Return the raw OpenAI response — clients already know this shape
  return json(data);
}

async function callAnthropic(
  body: ProxyRequest,
  userId: string,
): Promise<Response> {
  if (!ANTHROPIC_API_KEY) return json({ error: "Anthropic not configured" }, 503);

  const model = body.model ?? "claude-sonnet-4-6";

  // Anthropic separates the system message from conversation history
  const systemContent = body.messages.find((m) => m.role === "system")?.content ?? "";
  const convoMessages  = body.messages.filter((m) => m.role !== "system");

  const payload: Record<string, unknown> = {
    model,
    max_tokens: body.maxTokens ?? 1024,
    messages: convoMessages,
  };
  if (systemContent)    payload.system = systemContent;
  if (body.tools?.length) payload.tools = body.tools;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("Anthropic error:", res.status, err);
    return json({ error: "Anthropic request failed", detail: err }, 502);
  }

  const data = await res.json();
  const usage = data.usage ?? {};
  await recordUsage(userId, "anthropic", model, usage.input_tokens ?? 0, usage.output_tokens ?? 0);

  // Normalize to OpenAI shape so all callers work identically regardless of provider
  const normalized = {
    choices: [
      {
        message: {
          role: "assistant",
          content: (data.content as Array<{ type: string; text?: string }> ?? [])
            .find((c) => c.type === "text")?.text ?? "",
          tool_calls: (data.content as Array<{ type: string; id?: string; name?: string; input?: unknown }> ?? [])
            .filter((c) => c.type === "tool_use")
            .map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) },
            })),
        },
        finish_reason: data.stop_reason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens:     usage.input_tokens  ?? 0,
      completion_tokens: usage.output_tokens ?? 0,
    },
    model,
  };

  return json(normalized);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  // Authenticate
  const userId = await getUserId(req.headers.get("authorization"));
  if (!userId) return json({ error: "Unauthorized" }, 401);

  // Rate limit
  if (!(await isWithinRateLimit(userId))) {
    return json({ error: "Rate limit exceeded — try again later." }, 429);
  }

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.messages?.length) return json({ error: "messages is required" }, 400);

  const provider = body.provider ?? "openai";

  if (provider === "openai")    return callOpenAI(body, userId);
  if (provider === "anthropic") return callAnthropic(body, userId);

  return json({ error: `Unknown provider: ${provider}` }, 400);
});
