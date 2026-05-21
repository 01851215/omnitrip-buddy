-- Embeddings table for RAG-based travel planning
-- content_type: 'template' | 'reflection' | 'journal' | 'user_history'
-- user_id is null for global (template) embeddings; set for user-specific content
create table if not exists public.embeddings (
  id           uuid        primary key default gen_random_uuid(),
  content_type text        not null,
  content_id   text        not null,
  user_id      uuid        references auth.users(id) on delete cascade,
  content      text        not null,
  embedding    vector(1536) not null,
  metadata     jsonb       not null default '{}',
  created_at   timestamptz not null default now(),

  -- Prevent duplicate embeddings for the same content
  unique (content_type, content_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- IVFFlat index for fast cosine similarity search (lists = sqrt(expected row count))
create index if not exists embeddings_embedding_idx
  on public.embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Support fast filtering by content_type and user
create index if not exists embeddings_user_type_idx
  on public.embeddings (user_id, content_type);

-- RLS: users can read global embeddings + their own; all writes go through service role
alter table public.embeddings enable row level security;

create policy "Read global and own embeddings"
  on public.embeddings
  for select
  to authenticated
  using (user_id is null or user_id = auth.uid());
