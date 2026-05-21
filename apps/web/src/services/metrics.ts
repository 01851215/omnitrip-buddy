/**
 * Core Web Vitals reporter — sends real-user performance measurements to the
 * report-metric edge function so they land in the metrics table.
 *
 * Uses the web-vitals library (Google's official CWV measurement library).
 * Reports use `keepalive: true` to survive page-unload race conditions.
 *
 * Call reportWebVitals() once after the React root is mounted.
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";
import { supabase } from "@omnitrip/shared/services/supabase";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface MetricPayload {
  name: string;
  value: number;
  rating?: string;
  id?: string;
  page: string;
}

async function send(payload: MetricPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  await fetch(`${SUPABASE_URL}/functions/v1/report-metric`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => {}); // metrics are best-effort — never throw
}

export function reportWebVitals(): void {
  const page = window.location.pathname;

  const report = (m: { name: string; value: number; rating?: string; id?: string }) =>
    void send({ name: m.name, value: m.value, rating: m.rating, id: m.id, page });

  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
