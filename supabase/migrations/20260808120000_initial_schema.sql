-- Initial schema. (1f1)
--
-- Three tables, all owner-scoped. The site is multi-user from day one (decision 2026-08-06),
-- so every row belongs to exactly one signed-in person and row-level security is what makes
-- shipping the anon key to the browser safe.

-- Who is training. Powers the doorman (4e): Jodi gets the course as built, Bill gets it with
-- the names swapped, Kayla gets locked out, anyone else supplies a name.
create type public.player_role as enum ('jodi', 'bill', 'kayla', 'other');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role         public.player_role not null default 'other',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One row per chapter per person. chapter_id is text rather than a foreign key: chapters are
-- content, they live in the repo, and a database migration should not be needed to rename one.
create table public.chapter_progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  chapter_id  text not null,
  status      text not null default 'not_started'
              check (status in ('not_started', 'in_progress', 'done')),
  stars       smallint not null default 0 check (stars between 0 and 3),
  best_score  integer,
  updated_at  timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

-- Ticked boxes in the Ch8 practice programme. Presence of the row IS the tick, so unchecking
-- deletes it — no nullable booleans to reason about.
create table public.plan_checks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  item_id    text not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- --- row-level security ----------------------------------------------------
--
-- Everything is deny-by-default once RLS is enabled, and each policy grants access only to
-- rows the caller owns. This is the entire reason the anon key can ship in the client.

alter table public.profiles         enable row level security;
alter table public.chapter_progress enable row level security;
alter table public.plan_checks      enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "own progress" on public.chapter_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own plan checks" on public.plan_checks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- housekeeping ----------------------------------------------------------

-- A profile row the moment someone signs up, so the app never has to cope with a signed-in
-- user who has no profile. security definer because the trigger runs before the new user can
-- authenticate as themselves; the empty search_path is the standard hardening for that.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger chapter_progress_touch_updated_at
  before update on public.chapter_progress
  for each row execute function public.touch_updated_at();
