import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const OPENAI_API_KEY   = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS  = 1536;

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

interface RetrieveRequest {
  query: string;
  content_types?: string[];  // filter by type; omit for all
  k?: number;                // number of results (default 5)
  threshold?: number;        // minimum similarity (default 0.3)
}

interface RetrieveResult {
  content_type: string;
  content_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMS }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings failed ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  if (!OPENAI_API_KEY) return json({ error: "OpenAI not configured" }, 503);

  // Auth: validate user JWT
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: RetrieveRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { query, content_types, k = 5, threshold = 0.3 } = body;
  if (!query?.trim()) return json({ error: "query is required" }, 400);

  try {
    // Embed the query
    const queryEmbedding = await getEmbedding(query);

    // Call the match_embeddings Postgres RPC
    const { data, error } = await admin.rpc("match_embeddings", {
      query_embedding:  queryEmbedding,
      match_threshold:  threshold,
      match_count:      k,
      filter_types:     content_types ?? null,
      filter_user_id:   user.id,
    });

    if (error) {
      console.error("match_embeddings RPC error:", error);
      return json({ error: "Retrieval failed", detail: error.message }, 500);
    }

    const results: RetrieveResult[] = (data ?? []).map((row: Record<string, unknown>) => ({
      content_type: row.content_type as string,
      content_id:   row.content_id as string,
      content:      row.content as string,
      metadata:     (row.metadata ?? {}) as Record<string, unknown>,
      similarity:   row.similarity as number,
    }));

    return json({ results, query, count: results.length });
  } catch (err) {
    console.error("rag-retrieve error:", err);
    return json({ error: String(err) }, 500);
  }
});
