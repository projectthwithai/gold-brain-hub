-- Liquid Pomodoro session logs for analytics
create table if not exists public.timer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  timer_id text not null,
  timer_name text not null,
  event_type text not null check (
    event_type in (
      'work_start',
      'work_stop',
      'work_limit',
      'rest_start',
      'rest_complete',
      'rest_skipped',
      'long_break_start',
      'long_break_complete',
      'long_break_skipped'
    )
  ),
  work_seconds integer,
  rest_minutes integer,
  rest_raw_minutes numeric(6, 2),
  rest_credit_seconds integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists timer_logs_user_created_idx
  on public.timer_logs (user_id, created_at desc);

create index if not exists timer_logs_timer_idx
  on public.timer_logs (user_id, timer_id, created_at desc);

alter table public.timer_logs enable row level security;

create policy "Users can insert own timer logs"
  on public.timer_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own timer logs"
  on public.timer_logs for select
  using (auth.uid() = user_id);
