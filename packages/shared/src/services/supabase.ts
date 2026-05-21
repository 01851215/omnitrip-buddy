/**
 * Shared Supabase client.
 *
 * MUST call initSupabase(url, anonKey) before any Supabase call.
 *   - apps/web/src/main.tsx  → initSupabase(import.meta.env.VITE_SUPABASE_URL, ...)
 *   - apps/mobile/src/setup.ts → initSupabase(process.env.EXPO_PUBLIC_SUPABASE_URL!, ...)
 *
 * The storage adapter is read from the platform layer at init time:
 *   - Web:    localStorage (default — no setStorageAdapter() call needed)
 *   - Mobile: AsyncStorage (registered via setStorageAdapter() before initSupabase())
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStorageAdapter } from "../platform/storage";

let _client: SupabaseClient | null = null;
let _url = "";

export function getSupabaseUrl(): string { return _url; }

export function initSupabase(url: string, anonKey: string): void {
  _url = url ?? "";
  if (!url || !anonKey) {
    console.warn("initSupabase: missing url or anonKey — Supabase will not work.");
  }
  _client = createClient(url ?? "https://placeholder.supabase.co", anonKey ?? "placeholder", {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage: getStorageAdapter() as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // each app handles deep links itself
    },
  });
}

function getClient(): SupabaseClient {
  if (!_client) {
    // Fallback init with empty keys — keeps existing web code working if initSupabase() was not
    // called explicitly (e.g. during unit tests or storybook).
    console.warn("Supabase accessed before initSupabase() — call initSupabase(url, key) in your app entry point.");
    _client = createClient("https://placeholder.supabase.co", "placeholder");
  }
  return _client;
}

/**
 * Proxy so callers can keep writing `supabase.from(...)` without changes.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    // React (Fast Refresh / DevTools) checks $$typeof to test if an object is a React
    // element or component.  Returning undefined here is correct (supabase is neither)
    // and avoids triggering the "accessed before initSupabase" warning before setup.ts
    // has had a chance to run.
    if (prop === "$$typeof" || typeof prop === "symbol") {
      return _client ? (_client as any)[prop] : undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getClient() as any)[prop];
  },
});
