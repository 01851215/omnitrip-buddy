import { supabase } from "./supabase";
import type { CalendarEvent } from "../types";

// ── Deep links (zero config, one click) ────────────────

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const start = toICSDate(event.startTime);
  const end = toICSDate(event.endTime);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description ?? "",
    trp: "false",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    rru: "addevent",
    subject: event.title,
    startdt: new Date(event.startTime).toISOString(),
    enddt: new Date(event.endTime).toISOString(),
    body: event.description ?? "",
    path: "/calendar/action/compose",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}

export function openAllInGoogle(events: CalendarEvent[]) {
  for (const e of events.slice(0, 10)) {
    window.open(googleCalendarUrl(e), "_blank");
  }
}

export function openAllInOutlook(events: CalendarEvent[]) {
  for (const e of events.slice(0, 10)) {
    window.open(outlookCalendarUrl(e), "_blank");
  }
}

// ── .ics file download ─────────────────────────────────

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function downloadICS(events: CalendarEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OmniTrip//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:OmniTrip",
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@omnitrip.app`,
      `DTSTART:${toICSDate(e.startTime)}`,
      `DTEND:${toICSDate(e.endTime)}`,
      `SUMMARY:${escapeICS(e.title)}`,
      `DESCRIPTION:${escapeICS(e.description ?? "")}`,
      `DTSTAMP:${toICSDate(new Date().toISOString())}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "omnitrip-events.ics";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Subscription URL (auto-sync) ───────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";

export function getSubscriptionUrl(feedToken: string): string {
  return `${SUPABASE_URL}/functions/v1/calendar-feed?token=${feedToken}`;
}

export async function getOrCreateFeedToken(userId: string): Promise<string | null> {
  // Check for existing subscription
  const { data: existing } = await supabase
    .from("calendar_subscriptions")
    .select("feed_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.feed_token) return existing.feed_token;

  // Create new subscription with a random token
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("calendar_subscriptions")
    .insert({ user_id: userId, feed_token: token });

  if (error) {
    console.warn("Failed to create calendar subscription:", error.message);
    return null;
  }
  return token;
}

export async function revokeFeedToken(userId: string): Promise<void> {
  await supabase
    .from("calendar_subscriptions")
    .delete()
    .eq("user_id", userId);
}
