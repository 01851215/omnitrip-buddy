/**
 * Verifies that the GraphQL TripNode mapper produces the same Trip shape
 * as the Supabase JS mapTrip utility — ensuring the GraphQL layer is
 * a drop-in replacement, not a divergent data model.
 */

import { describe, it, expect } from "vitest";
import { mapTrip } from "@omnitrip/shared/utils/mapRow";

// Mirror of the private mapTripNode function in useTrips.ts.
// Both must produce an identical Trip from equivalent source data.
// pg_graphql preserves snake_case column names (no auto-inflection by default).
function mapTripNode(node: {
  id: string; user_id: string; title: string; status: string;
  start_date: string; end_date: string; cover_image: string | null;
  description: string | null; created_at: string;
}) {
  return {
    id: node.id,
    userId: node.user_id,
    title: node.title,
    status: node.status as "planning" | "active" | "completed",
    startDate: node.start_date,
    endDate: node.end_date,
    coverImage: node.cover_image ?? undefined,
    description: node.description ?? undefined,
    createdAt: new Date(node.created_at).getTime(),
  };
}

describe("useAllTrips — GraphQL ↔ Supabase JS shape parity", () => {
  const CREATED_AT_ISO = "2025-06-01T10:00:00Z";
  const CREATED_AT_EPOCH = new Date(CREATED_AT_ISO).getTime();

  // Supabase JS row (snake_case)
  const supabaseRow = {
    id: "trip-1",
    user_id: "user-1",
    title: "Bali Retreat",
    status: "active" as const,
    start_date: "2025-07-01",
    end_date: "2025-07-14",
    cover_image: "https://cdn.test/bali.jpg",
    description: "A peaceful escape",
    created_at: CREATED_AT_ISO,
  };

  // pg_graphql node (snake_case — pg_graphql preserves column names)
  const graphqlNode = {
    id: "trip-1",
    user_id: "user-1",
    title: "Bali Retreat",
    status: "active",
    start_date: "2025-07-01",
    end_date: "2025-07-14",
    cover_image: "https://cdn.test/bali.jpg",
    description: "A peaceful escape",
    created_at: CREATED_AT_ISO,
  };

  it("both mappers produce the same Trip shape", () => {
    const fromSupabase = mapTrip(supabaseRow);
    const fromGraphQL  = mapTripNode(graphqlNode);

    expect(fromGraphQL).toEqual(fromSupabase);
  });

  it("createdAt is epoch milliseconds in both paths", () => {
    expect(mapTrip(supabaseRow).createdAt).toBe(CREATED_AT_EPOCH);
    expect(mapTripNode(graphqlNode).createdAt).toBe(CREATED_AT_EPOCH);
  });

  it("null optional fields become undefined in both paths", () => {
    const nullSupabase = { ...supabaseRow, cover_image: null, description: null };
    const nullGraphQL  = { ...graphqlNode, cover_image: null, description: null };

    expect(mapTrip(nullSupabase).coverImage).toBeUndefined();
    expect(mapTripNode(nullGraphQL).coverImage).toBeUndefined();

    expect(mapTrip(nullSupabase).description).toBeUndefined();
    expect(mapTripNode(nullGraphQL).description).toBeUndefined();
  });
});
