-- ════════════════════════════════════════════════════════════════════
-- Route Mate · Supabase schema (onboarding + pods)
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. It is safe to run more than once.
--
-- SECURITY MODEL: the browser only ever holds the public "anon" key, so
-- Row Level Security (RLS) is the ONLY thing protecting the data. Every
-- table below has RLS enabled and explicit policies. Never put the
-- service_role key in the React app.
-- ════════════════════════════════════════════════════════════════════

-- ─── profiles: one row per signed-in user (id = auth.users.id) ───────
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text        not null default '',
  email            text,
  transport        text[]      not null default '{}',
  route_from       text        not null default '',
  route_to         text        not null default '',
  route_from_place jsonb,      -- { id, name, label, lat, lng, kind } from the place search
  route_to_place   jsonb,
  commute_times    text[]      not null default '{}',
  interests        text[]      not null default '{}',
  privacy          text        not null default 'public'
                   check (privacy in ('public', 'friends', 'private')),
  onboarded        boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── pods: community groups anyone signed in can discover ────────────
create table if not exists public.pods (
  id            bigint generated always as identity primary key,
  name          text   not null,
  type          text   not null,
  transport     text,
  time_window   text,
  filter_type   text   check (filter_type in ('route', 'stop', 'time', 'interest')),
  route_from    text,
  route_to      text,
  interest_tags text[] not null default '{}',   -- same labels as the onboarding interest chips
  created_by    uuid   references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ─── pod_members: who has joined which pod ───────────────────────────
create table if not exists public.pod_members (
  pod_id    bigint      not null references public.pods (id) on delete cascade,
  user_id   uuid        not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pod_id, user_id)
);
create index if not exists pod_members_user_idx on public.pod_members (user_id);

-- ─── keep profiles.updated_at fresh ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── create a profile automatically when someone signs up ────────────
-- Runs with elevated rights (security definer) because the new user has
-- no session yet. Google sign-in supplies full_name, email sign-up
-- supplies name (passed from the React app in signUp options.data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── member counts without exposing who is in a pod ──────────────────
-- A plain view runs with its owner's rights, so it can count pod_members
-- rows the caller is not allowed to read. It exposes ONLY the count.
-- (Supabase's linter may flag this as a "security definer view" — here
-- that is intentional.)
create or replace view public.pods_with_counts as
  select p.*,
         (select count(*) from public.pod_members m where m.pod_id = p.id)::int as member_count
  from public.pods p;

-- ═══════════════ Row Level Security ═══════════════
alter table public.profiles    enable row level security;
alter table public.pods        enable row level security;
alter table public.pod_members enable row level security;

-- profiles: a user can read and change ONLY their own row
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- pods: any signed-in user can browse; only the creator can create-as / edit / delete
drop policy if exists "pods: read all"        on public.pods;
drop policy if exists "pods: create as self"  on public.pods;
drop policy if exists "pods: creator updates" on public.pods;
drop policy if exists "pods: creator deletes" on public.pods;
create policy "pods: read all"        on public.pods for select to authenticated using (true);
create policy "pods: create as self"  on public.pods for insert to authenticated with check (created_by = auth.uid());
create policy "pods: creator updates" on public.pods for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "pods: creator deletes" on public.pods for delete to authenticated using (created_by = auth.uid());

-- pod_members: you can see, add and remove only YOUR OWN memberships
drop policy if exists "members: read own"   on public.pod_members;
drop policy if exists "members: join as self" on public.pod_members;
drop policy if exists "members: leave own"  on public.pod_members;
create policy "members: read own"     on public.pod_members for select to authenticated using (user_id = auth.uid());
create policy "members: join as self" on public.pod_members for insert to authenticated with check (user_id = auth.uid());
create policy "members: leave own"    on public.pod_members for delete to authenticated using (user_id = auth.uid());

-- the counts view is readable by signed-in users only
revoke all on public.pods_with_counts from anon;
grant select on public.pods_with_counts to authenticated;

-- ─── seed the starter pods (only when the table is empty) ────────────
insert into public.pods (name, type, transport, time_window, filter_type, route_from, route_to, interest_tags)
select * from (values
  ('Midrand → Wits',          'Route-based · Gautrain',      'gautrain', '7:30–9am',  'route',    'Midrand',      'Wits', '{}'::text[]),
  ('Wits Campus Students',    'Interest-based · Students',   'gautrain', 'All day',   'interest', null,           null,   array['📚 Study']),
  ('Pretoria CBD Evening',    'Route · 5–7pm',               'bus',      '5–7pm',     'route',    'Pretoria',     null,   '{}'::text[]),
  ('Centurion 8am Commuters', 'Time-based · Gautrain',       'gautrain', '7:30–9am',  'time',     'Centurion',    null,   '{}'::text[]),
  ('Joburg Tech Workers',     'Interest · Technology',        'gautrain', 'All day',   'interest', null,           null,   array['💻 Tech', '💼 Business']),
  ('Noord St Bus Regulars',   'Stop-based · Bus',            'bus',      'All day',   'stop',     'Noord Street', null,   '{}'::text[])
) as v (name, type, transport, time_window, filter_type, route_from, route_to, interest_tags)
where not exists (select 1 from public.pods);