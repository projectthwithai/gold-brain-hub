-- Gold Brain Hub: routine steps + partnerships
-- Does NOT alter the existing `routines` JSON blob table used by the app.

-- ── Normalized routine items (mirrors sched[] entries) ──────────
create table if not exists public.user_routine_items (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  time text not null default '08:00',
  icon text default '📌',
  freq text default 'daily',
  days integer[] default '{0,1,2,3,4,5,6}',
  is_shared boolean not null default false,
  done boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists user_routine_items_shared_idx
  on public.user_routine_items (user_id, is_shared);

-- ── Nested steps ────────────────────────────────────────────────
create table if not exists public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  step_order integer not null default 0,
  is_completed boolean not null default false,
  completed_date date,
  created_at timestamptz not null default now(),
  foreign key (user_id, routine_id)
    references public.user_routine_items(user_id, id) on delete cascade
);

create index if not exists routine_steps_routine_idx
  on public.routine_steps (user_id, routine_id, step_order);

-- ── Partnerships & invite codes ───────────────────────────────
create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'active')),
  invite_code text unique,
  created_at timestamptz not null default now()
);

create index if not exists partnerships_owner_idx on public.partnerships (owner_id);
create index if not exists partnerships_partner_idx on public.partnerships (partner_id);
create index if not exists partnerships_invite_idx on public.partnerships (invite_code);

-- ── Partner activity feed ───────────────────────────────────────
create table if not exists public.partner_activities (
  id uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  message text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_activities_partnership_idx
  on public.partner_activities (partnership_id, created_at desc);

-- ── Shared progress snapshots ───────────────────────────────────
create table if not exists public.partner_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, partnership_id)
);

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.user_routine_items enable row level security;
alter table public.routine_steps enable row level security;
alter table public.partnerships enable row level security;
alter table public.partner_activities enable row level security;
alter table public.partner_snapshots enable row level security;

create policy "Users manage own routine items"
  on public.user_routine_items for all using (auth.uid() = user_id);

create policy "Partners read shared routine items"
  on public.user_routine_items for select using (
    is_shared = true and exists (
      select 1 from public.partnerships p
      where p.status = 'active'
        and ((p.owner_id = auth.uid() and p.partner_id = user_routine_items.user_id)
          or (p.partner_id = auth.uid() and p.owner_id = user_routine_items.user_id))
    )
  );

create policy "Users manage own steps"
  on public.routine_steps for all using (auth.uid() = user_id);

create policy "Partners read shared steps"
  on public.routine_steps for select using (
    exists (
      select 1 from public.user_routine_items r
      join public.partnerships p on p.status = 'active'
        and ((p.owner_id = auth.uid() and p.partner_id = r.user_id)
          or (p.partner_id = auth.uid() and p.owner_id = r.user_id))
      where r.user_id = routine_steps.user_id
        and r.id = routine_steps.routine_id
        and r.is_shared = true
    )
  );

create policy "Users manage own partnerships"
  on public.partnerships for all using (
    auth.uid() = owner_id or auth.uid() = partner_id
  );

create policy "Anyone with code can read pending invite"
  on public.partnerships for select using (
    auth.uid() = owner_id
    or auth.uid() = partner_id
    or (status = 'pending' and invite_code is not null)
  );

create policy "Partners read activities"
  on public.partner_activities for select using (
    exists (
      select 1 from public.partnerships p
      where p.id = partner_activities.partnership_id
        and (p.owner_id = auth.uid() or p.partner_id = auth.uid())
    )
  );

create policy "Users insert activities"
  on public.partner_activities for insert with check (auth.uid() = user_id);

create policy "Users manage own snapshots"
  on public.partner_snapshots for all using (auth.uid() = user_id);

create policy "Partners read snapshots"
  on public.partner_snapshots for select using (
    exists (
      select 1 from public.partnerships p
      where p.id = partner_snapshots.partnership_id
        and p.status = 'active'
        and (p.owner_id = auth.uid() or p.partner_id = auth.uid())
    )
  );
