/**
 * Typed GraphQL client for Supabase's pg_graphql endpoint (/graphql/v1).
 *
 * pg_graphql auto-generates a GraphQL schema from the Postgres schema using
 * the authenticated user's RLS policies — no extra permissions to configure.
 *
 * Usage:
 *   const client = await getGraphQLClient();
 *   const data = await client.request<MyQueryType>(QUERY, variables);
 */

import { GraphQLClient } from "graphql-request";
import { supabase } from "@omnitrip/shared/services/supabase";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const GRAPHQL_ENDPOINT = `${SUPABASE_URL}/graphql/v1`;

/**
 * Returns a GraphQLClient authenticated with the current user's session JWT.
 * Falls back to the anon role if no session is active (RLS will filter rows).
 */
export async function getGraphQLClient(): Promise<GraphQLClient> {
  const { data: { session } } = await supabase.auth.getSession();

  return new GraphQLClient(GRAPHQL_ENDPOINT, {
    headers: {
      apikey: SUPABASE_ANON,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  });
}
