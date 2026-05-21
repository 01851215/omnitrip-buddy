-- RPC function for cosine-similarity RAG retrieval
-- Called by the rag-retrieve edge function
create or replace function match_embeddings(
  query_embedding  vector(1536),
  match_threshold  float   default 0.3,
  match_count      int     default 5,
  filter_types     text[]  default null,   -- e.g. ARRAY['template','reflection']
  filter_user_id   uuid    default null    -- null = include global embeddings only
)
returns table (
  id           uuid,
  content_type text,
  content_id   text,
  content      text,
  metadata     jsonb,
  similarity   float
)
language plpgsql security definer
as $$
begin
  return query
  select
    e.id,
    e.content_type,
    e.content_id,
    e.content,
    e.metadata,
    (1 - (e.embedding <=> query_embedding))::float as similarity
  from public.embeddings e
  where
    -- content type filter (optional)
    (filter_types is null or e.content_type = any(filter_types))
    -- user scope: global embeddings (user_id is null) + the requesting user's embeddings
    and (e.user_id is null or e.user_id = filter_user_id)
    -- minimum similarity threshold
    and (1 - (e.embedding <=> query_embedding)) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
