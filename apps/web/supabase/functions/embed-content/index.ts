import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EMBEDDING_MODEL  = "text-embedding-3-small";
const EMBEDDING_DIMS   = 1536;

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

interface EmbedRequest {
  content_type: string;   // 'template' | 'reflection' | 'journal' | 'user_history'
  content_id: string;     // template id, trip id, entry id, etc.
  content: string;        // text to embed
  metadata?: Record<string, unknown>;
  user_id?: string;       // omit for global (template) embeddings
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

  // Auth: accept user JWT or service role key
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // Verify caller is either a real user or the service role itself (for seeding)
  const { data: { user } } = await admin.auth.getUser(token);
  const isServiceRole = !user && token === SUPABASE_SERVICE;
  if (!user && !isServiceRole) return json({ error: "Unauthorized" }, 401);

  let body: EmbedRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { content_type, content_id, content, metadata = {}, user_id } = body;
  if (!content_type || !content_id || !content) {
    return json({ error: "content_type, content_id, and content are required" }, 400);
  }

  try {
    const embedding = await getEmbedding(content);

    // Delete any existing row for this content (handles NULL user_id correctly —
    // the functional unique index uses coalesce but PostgREST onConflict can't express that)
    const deleteQ = admin
      .from("embeddings")
      .delete()
      .eq("content_type", content_type)
      .eq("content_id", content_id);
    if (user_id) {
      deleteQ.eq("user_id", user_id);
    } else {
      deleteQ.is("user_id", null);
    }
    await deleteQ;

    // Insert fresh embedding
    const { data, error } = await admin
      .from("embeddings")
      .insert({
        content_type,
        content_id,
        user_id: user_id ?? null,
        content,
        embedding: JSON.stringify(embedding),
        metadata,
      })
      .select("id, content_type, content_id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return json({ error: "Database write failed", detail: error.message }, 500);
    }

    return json({ success: true, ...data });
  } catch (err) {
    console.error("embed-content error:", err);
    return json({ error: String(err) }, 500);
  }
});
