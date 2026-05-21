-- Core Web Vitals and error telemetry table.
-- Stores real-user measurements reported by the web-vitals library.
-- user_id is nullable — metrics fire on page unload and may miss the session.
create table if not exists public.metrics (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete set null,
  name       text        not null,   -- 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB' | 'error'
  value      float       not null,   -- ms for timing metrics, unitless for CLS
  rating     text,                   -- 'good' | 'needs-improvement' | 'poor'
  page       text,                   -- window.location.pathname at measurement time
  created_at timestamptz not null default now()
);

-- Index for analytics queries (aggregate by name + time range)
create index if not exists metrics_name_created_idx
  on public.metrics (name, created_at desc);

-- RLS: users can read their own metrics; inserts are via service role (report-metric edge fn)
alter table public.metrics enable row level security;

create policy "Users read own metrics"
  on public.metrics
  for select
  to authenticated
  using (user_id = auth.uid());
