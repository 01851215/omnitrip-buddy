-- Per-user LLM usage log for rate limiting and cost tracking
create table if not exists public.llm_usage (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  provider   text        not null,  -- 'openai' | 'anthropic'
  model      text        not null,
  tokens_in  integer     not null default 0,
  tokens_out integer     not null default 0,
  ts         timestamptz not null default now()
);

-- Index for sliding-window rate limit queries
create index if not exists llm_usage_user_ts_idx
  on public.llm_usage (user_id, ts desc);

-- RLS: users can read their own usage; writes via service role only
alter table public.llm_usage enable row level security;

create policy "Users read own usage"
  on public.llm_usage
  for select
  to authenticated
  using (user_id = auth.uid());
