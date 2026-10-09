-- Rumbo base tables. Every table has Row Level Security: a student reaches only their own rows.

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 30),
  birth_month smallint check (birth_month between 1 and 12),
  birth_year smallint check (birth_year between 1990 and 2100),
  grade smallint check (grade between 0 and 12),
  school text,
  language text not null default 'en' check (language in ('en', 'es')),
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  skills text[] not null default '{}',
  goals text[] not null default '{}',
  settings jsonb not null default '{}',
  consent_status text not null default 'not_needed' check (consent_status in ('not_needed', 'pending', 'approved')),
  updated_at timestamptz not null default now()
);

create table public.parent_consents (
  id uuid primary key default gen_random_uuid(),
  child_user_id uuid not null references auth.users on delete cascade,
  parent_email text not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.saved_opportunities (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  opportunity jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One table syncs every local tool (grades, homework, timer, ...).
create table public.local_items (
  user_id uuid not null references auth.users on delete cascade,
  tool text not null,
  item_id text not null,
  data jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  primary key (user_id, tool, item_id)
);

create table public.rec_feedback (
  user_id uuid not null references auth.users on delete cascade,
  item_id text not null,
  verdict text not null check (verdict in ('liked', 'not_interested')),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Shared, no personal data. Only the server (service role) writes here.
create table public.search_cache (
  key text primary key,
  results jsonb not null,
  created_at timestamptz not null default now()
);

-- Server only.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.profiles enable row level security;
alter table public.parent_consents enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.local_items enable row level security;
alter table public.rec_feedback enable row level security;
alter table public.search_cache enable row level security;
alter table public.rate_limits enable row level security;

create policy "own profile" on public.profiles for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own saved" on public.saved_opportunities for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own items" on public.local_items for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own feedback" on public.rec_feedback for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A student can see that a consent request exists for them, but never write it or read the token.
-- Parent approval is handled by server code using the service role.
create policy "see own consent" on public.parent_consents for select
  using (child_user_id = (select auth.uid()));
revoke all on public.parent_consents from anon, authenticated;
grant select (id, child_user_id, status, created_at, decided_at) on public.parent_consents to authenticated;

-- search_cache and rate_limits: RLS on with no policies = no access for students.
-- The service role bypasses RLS.

create index local_items_user_updated on public.local_items (user_id, updated_at);

-- A student must not be able to approve their own consent. Only the server (service role) may
-- set consent_status to anything but 'pending' / 'not_needed'.
create or replace function public.guard_consent_status() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and new.consent_status = 'approved'
     and (tg_op = 'INSERT' or old.consent_status is distinct from 'approved') then
    raise exception 'consent can only be approved by a parent';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_consent before insert or update on public.profiles
  for each row execute function public.guard_consent_status();
