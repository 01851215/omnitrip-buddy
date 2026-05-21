-- Enable pg_graphql so the GraphQL endpoint at /graphql/v1 is available.
-- Supabase projects include pg_graphql by default; this migration is an
-- explicit declaration that the project relies on it and documents the intent.
create extension if not exists pg_graphql with schema graphql;
