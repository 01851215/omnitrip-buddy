import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Look up which user this feed token belongs to
  const { data: sub } = await supabase
    .from("calendar_subscriptions")
    .select("user_id")
    .eq("feed_token", token)
    .single();

  if (!sub) {
    return new Response("Invalid or expired token", { status: 404, headers: corsHeaders });
  }

  // Fetch all calendar events for this user
  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", sub.user_id)
    .order("start_time", { ascending: true });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OmniTrip//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:OmniTrip",
    `X-WR-CALDESC:Your OmniTrip travel calendar`,
  ];

  for (const e of events ?? []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@omnitrip.app`,
      `DTSTART:${toICSDate(e.start_time)}`,
      `DTEND:${toICSDate(e.end_time)}`,
      `SUMMARY:${escapeICS(e.title ?? "")}`,
      `DESCRIPTION:${escapeICS(e.description ?? "")}`,
      `DTSTAMP:${toICSDate(e.created_at ?? new Date().toISOString())}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="omnitrip.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
