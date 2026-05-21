/**
 * Lightweight Core Web Vitals and error telemetry receiver.
 *
 * Accepts a single metric payload from the web-vitals library and stores it
 * in the metrics table. No auth required — metrics are sent on page unload
 * and we want to capture them even for unauthenticated visitors. User ID is
 * optionally extracted from the JWT if present.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

interface MetricPayload {
  name?: string;
  value?: number;
  rating?: string;
  id?: string;
  page?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  let body: MetricPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.name || body.value === undefined) {
    return json({ error: "name and value are required" }, 400);
  }

  // Optionally resolve user_id from JWT — gracefully skip if absent or invalid
  let userId: string | null = null;
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
      const { data: { user } } = await admin.auth.getUser(auth.slice(7));
      userId = user?.id ?? null;
    } catch { /* non-critical — continue without user_id */ }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { error } = await admin.from("metrics").insert({
    user_id: userId,
    name:    body.name,
    value:   body.value,
    rating:  body.rating ?? null,
    page:    body.page   ?? null,
  });

  if (error) {
    console.error("metrics insert error:", error.message);
    return json({ error: "Failed to store metric" }, 500);
  }

  return json({ ok: true });
});
