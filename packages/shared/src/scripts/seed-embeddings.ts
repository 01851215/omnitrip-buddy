/**
 * Seed the embeddings table with vector representations of all trip templates.
 *
 * Run once (idempotent — skips already-embedded content):
 *
 *   OPENAI_API_KEY=sk-...  \
 *   SUPABASE_URL=https://your-project.supabase.co  \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...  \
 *   npx ts-node --esm packages/shared/src/scripts/seed-embeddings.ts
 *
 * Requires ts-node in devDependencies (root package.json) or run via:
 *   node --import=tsx/esm packages/shared/src/scripts/seed-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";
import { templates } from "../data/templates.js";

// ── Config ─────────────────────────────────────────────────────────────────

const OPENAI_API_KEY       = process.env.OPENAI_API_KEY ?? "";
const SUPABASE_URL         = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMBEDDING_MODEL      = "text-embedding-3-small";
const EMBEDDING_DIMS       = 1536;
const BATCH_DELAY_MS       = 200; // avoid OpenAI rate limits

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env vars: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ─────────────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text, dimensions: EMBEDDING_DIMS }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

function templateToContent(t: (typeof templates)[number]): string {
  const destinations = t.destinations
    .map((d) => `${d.name} (${d.country}): ${d.activities.map((a) => a.title).join(", ")}`)
    .join(" | ");
  return [
    t.title,
    t.description,
    `Tags: ${t.tags.join(", ")}`,
    `Destinations: ${destinations}`,
    `Duration: ${t.duration} days, Budget: $${t.totalBudget}`,
  ].join("\n");
}

async function alreadyEmbedded(contentType: string, contentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("embeddings")
    .select("id")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .is("user_id", null)
    .maybeSingle();
  return !!data;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding ${templates.length} trip template embeddings...\n`);

  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const template of templates) {
    const contentType = "template";
    const contentId   = template.id;

    if (await alreadyEmbedded(contentType, contentId)) {
      console.log(`  ⏭  Skipping (already embedded): ${template.title}`);
      skipped++;
      continue;
    }

    try {
      const content   = templateToContent(template);
      const embedding = await embed(content);

      // Delete+insert pattern: the unique index uses coalesce(user_id, sentinel_uuid)
      // which PostgREST's onConflict can't reference directly.
      await supabase.from("embeddings").delete()
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .is("user_id", null);

      const { error } = await supabase.from("embeddings").insert({
        content_type: contentType,
        content_id:   contentId,
        user_id:      null,
        content,
        embedding:    JSON.stringify(embedding),
        metadata: {
          title:       template.title,
          tags:        template.tags,
          duration:    template.duration,
          totalBudget: template.totalBudget,
          destinations: template.destinations.map((d) => ({ name: d.name, country: d.country })),
        },
      });

      if (error) {
        console.error(`  ✗  Failed (DB): ${template.title} —`, error.message);
        failed++;
      } else {
        console.log(`  ✓  Embedded: ${template.title}`);
        seeded++;
      }

      await sleep(BATCH_DELAY_MS);
    } catch (err) {
      console.error(`  ✗  Failed (embed): ${template.title} —`, err);
      failed++;
    }
  }

  console.log(`\nDone. Seeded: ${seeded}  Skipped: ${skipped}  Failed: ${failed}\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
