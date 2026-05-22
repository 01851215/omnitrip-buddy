/**
 * RAG-powered destination suggestions hook.
 *
 * Strategy:
 *  1. Instant results from local template data (no latency, no auth required).
 *  2. For logged-in users, enriches with personalised RAG results from the
 *     rag-retrieve edge function (debounced 350ms to avoid hammering the API).
 *
 * Returns a deduplicated, ranked list of suggestions.
 */

import { useState, useEffect, useRef } from "react";
import { templates } from "../data/templates";
import { searchCities } from "../data/worldCities";
import { supabase, getSupabaseUrl } from "@omnitrip/shared/services/supabase";
import { useAuthContext } from "../components/auth/AuthProvider";

export interface DestinationSuggestion {
  id: string;
  title: string;
  destinations: string[];
  tags: string[];
  source: "rag" | "local";
  similarity?: number;
}

const DEBOUNCE_MS = 350;
const MIN_CHARS   = 1;   // single letter shows results immediately
const MAX_SUGGESTIONS = 7;

/** Fast local search over templates (prefix-first) + world cities. */
function searchLocal(query: string): DestinationSuggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // 1. Template search — starts-with scores higher than contains
  const templateResults = templates
    .map((t) => {
      const titleLower = t.title.toLowerCase();
      const titleScore = titleLower.startsWith(q) ? 5 : titleLower.includes(q) ? 3 : 0;
      const destScore  = t.destinations.some((d) => {
        const n = d.name.toLowerCase();
        const c = d.country.toLowerCase();
        return n.startsWith(q) || c.startsWith(q) ? 4 : n.includes(q) || c.includes(q) ? 2 : false;
      }) ? (t.destinations.some((d) => d.name.toLowerCase().startsWith(q) || d.country.toLowerCase().startsWith(q)) ? 4 : 2) : 0;
      const tagScore  = t.tags.some((tag) => tag.toLowerCase().startsWith(q)) ? 2
                       : t.tags.some((tag) => tag.toLowerCase().includes(q)) ? 1 : 0;
      const score = titleScore + destScore + tagScore;
      return { t, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ t }) => ({
      id: t.id,
      title: t.title,
      destinations: t.destinations.map((d) => d.name),
      tags: t.tags,
      source: "local" as const,
    }));

  // 2. World city search — fills remaining slots with matching cities
  //    Skip cities already covered by a template result
  const coveredNames = new Set(
    templateResults.flatMap((s) => [s.title.toLowerCase(), ...s.destinations.map((d) => d.toLowerCase())])
  );
  const cityResults = searchCities(q, MAX_SUGGESTIONS)
    .filter((c) => !coveredNames.has(c.name.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS - templateResults.length)
    .map((c) => ({
      id: `city-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
      title: c.name,
      destinations: [c.country],
      tags: [c.region],
      source: "local" as const,
    }));

  return [...templateResults, ...cityResults].slice(0, MAX_SUGGESTIONS);
}

/** Call rag-retrieve edge function with the user's JWT. */
async function fetchRAGSuggestions(
  query: string,
  token: string,
): Promise<DestinationSuggestion[]> {
  const url = `${getSupabaseUrl()}/functions/v1/rag-retrieve`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
    },
    body: JSON.stringify({
      query,
      content_types: ["template"],
      k: MAX_SUGGESTIONS,
      threshold: 0.25,
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const data = await res.json() as {
    results?: Array<{
      content_id: string;
      metadata?: {
        title?: string;
        tags?: string[];
        destinations?: Array<{ name: string }>;
      };
      similarity: number;
    }>;
  };

  return (data.results ?? []).map((r) => ({
    id: r.content_id,
    title: r.metadata?.title ?? r.content_id,
    destinations: (r.metadata?.destinations ?? []).map((d) => d.name),
    tags: r.metadata?.tags ?? [],
    source: "rag" as const,
    similarity: r.similarity,
  }));
}

/** Merge RAG + local results, deduplicating by id, RAG results take precedence. */
function merge(rag: DestinationSuggestion[], local: DestinationSuggestion[]): DestinationSuggestion[] {
  const seen = new Set<string>();
  const merged: DestinationSuggestion[] = [];
  for (const s of [...rag, ...local]) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }
  return merged.slice(0, MAX_SUGGESTIONS);
}

export function useDestinationSuggestions(query: string) {
  const { user } = useAuthContext();
  const [suggestions, setSuggestions]   = useState<DestinationSuggestion[]>([]);
  const [ragLoading, setRagLoading]     = useState(false);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef                        = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    // Clear when input is too short
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setRagLoading(false);
      return;
    }

    // Show local results immediately (zero latency)
    const local = searchLocal(trimmed);
    setSuggestions(local);

    // Debounce the RAG call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    // Only call RAG for logged-in users
    if (!user) return;

    setRagLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setRagLoading(false);
          return;
        }

        const ragResults = await fetchRAGSuggestions(trimmed, token);
        setSuggestions((prev) => merge(ragResults, prev));
      } catch {
        // RAG unavailable — local results already shown, nothing to do
      } finally {
        setRagLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  return { suggestions, ragLoading };
}
