/**
 * Trip hooks for the web app.
 *
 * useAllTrips is implemented here using the pg_graphql endpoint for selective
 * field fetching. pg_graphql preserves snake_case column names (no auto-inflection).
 * All other hooks delegate to the shared Supabase JS implementation.
 */

// Re-export all hooks except useAllTrips, which we override below
export {
  useActiveTrip,
  useCompletedTrips,
  useDreamTrips,
  useDestinations,
  useAllDestinations,
  updateTripStatus,
  type DestinationCoord,
} from "@omnitrip/shared/hooks/useTrips";

import { useState, useEffect } from "react";
import { useAuthContext } from "@omnitrip/shared/auth/context";
import { getGraphQLClient } from "../services/graphql";
import type { Trip } from "@omnitrip/shared/types";

// ── GraphQL query ─────────────────────────────────────────────────────────────

// pg_graphql exposes columns using their original snake_case names.
// Selective field fetching avoids over-fetching large columns we don't need
// on the home screen (e.g. full itinerary JSON or attachments).
const ALL_TRIPS_QUERY = `
  query AllTrips($userId: UUID!) {
    tripsCollection(filter: { user_id: { eq: $userId } }) {
      edges {
        node {
          id
          user_id
          title
          status
          start_date
          end_date
          cover_image
          description
          created_at
        }
      }
    }
  }
`;

interface TripNode {
  id: string;
  user_id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  description: string | null;
  created_at: string;
}

interface AllTripsResult {
  tripsCollection: {
    edges: Array<{ node: TripNode }>;
  };
}

function mapTripNode(node: TripNode): Trip {
  return {
    id: node.id,
    userId: node.user_id,
    title: node.title,
    status: node.status as Trip["status"],
    startDate: node.start_date,
    endDate: node.end_date,
    coverImage: node.cover_image ?? undefined,
    description: node.description ?? undefined,
    createdAt: new Date(node.created_at).getTime(),
  };
}

// ── GraphQL-powered hook ──────────────────────────────────────────────────────

/**
 * Fetches all trips for the current user via Supabase pg_graphql.
 * Returns the same { trips, loading } shape as the shared hook.
 */
export function useAllTrips(): { trips: Trip[]; loading: boolean } {
  const { user } = useAuthContext();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    getGraphQLClient()
      .then((client) =>
        client.request<AllTripsResult>(ALL_TRIPS_QUERY, { userId: user.id }),
      )
      .then((data) => {
        setTrips(data.tripsCollection.edges.map((e) => mapTripNode(e.node)));
        setLoading(false);
      })
      .catch((err) => {
        // GraphQL unavailable (local dev without Supabase, network error, etc.)
        // Log and return empty — shared hook can be used as fallback if needed.
        console.warn("useAllTrips GraphQL failed:", err);
        setTrips([]);
        setLoading(false);
      });
  }, [user]);

  return { trips, loading };
}
