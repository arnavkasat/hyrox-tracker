-- Hyrox Tracker — core schema.
--
-- Single-user app, but every table still carries user_id + row-level security
-- so the data is scoped correctly if a second account ever exists.

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without the app having to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------- settings --
-- Exactly one row per user: race date, body stats, targets, sync bookkeeping.
create table public.settings (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,

  race_date            date not null,
  training_start_date  date not null,
  timezone             text not null default 'UTC',

  height_cm            numeric(5,1),
  body_weight_kg       numeric(5,2),

  calorie_target_min   integer not null default 2700,
  calorie_target_max   integer not null default 2900,
  protein_target_min   integer not null default 130,
  protein_target_max   integer not null default 145,

  -- Paces stored as seconds per km so arithmetic stays integer-simple.
  easy_pace_min_sec    integer not null default 345,  -- 5:45/km
  easy_pace_max_sec    integer not null default 375,  -- 6:15/km
  race_pace_sec        integer not null default 300,  -- 5:00/km

  last_sync_at         timestamptz,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ----------------------------------------------------------- plan_sessions --
-- One planned training day. `planned` holds the prescription as JSON:
--   [{ "exercise": "Back squat", "sets": 4, "reps": "5-8", "unit": "kg" }, ...]
create table public.plan_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  date          date not null,
  week          integer not null,
  phase         text not null,
  type          text not null,
  title         text not null,
  planned       jsonb not null default '[]'::jsonb,
  notes         text,

  status        text not null default 'planned'
                check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  with_partner  boolean not null default false,

  started_at    timestamptz,
  completed_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- One session per calendar day; makes the generator safely re-runnable.
  unique (user_id, date)
);

create index plan_sessions_user_date_idx on public.plan_sessions (user_id, date);
create index plan_sessions_user_week_idx on public.plan_sessions (user_id, week);


-- ----------------------------------------------------------- exercise_logs --
create table public.exercise_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid not null references public.plan_sessions(id) on delete cascade,

  exercise        text not null,
  exercise_order  integer not null default 0,
  set_number      integer not null,

  weight_kg       numeric(6,2),
  reps            integer,
  effort          integer check (effort between 1 and 10),

  completed       boolean not null default false,
  completed_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (session_id, exercise, set_number)
);

create index exercise_logs_user_exercise_idx
  on public.exercise_logs (user_id, exercise, completed_at desc);


-- ---------------------------------------------------------- daily_checkins --
create table public.daily_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  date        date not null,
  weight_kg   numeric(5,2),
  energy      integer check (energy between 1 and 5),
  soreness    integer check (soreness between 1 and 5),
  note        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, date)
);

create index daily_checkins_user_date_idx on public.daily_checkins (user_id, date desc);


-- ---------------------------------------------------------- health_metrics --
-- One row per day. Health Auto Export sends each metric separately, so the
-- ingest endpoint merges metric-by-metric into the row for that date; a null
-- column just means that metric has not arrived yet.
create table public.health_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  date         date not null,
  resting_hr   integer,
  hrv_ms       numeric(6,2),
  sleep_hours  numeric(4,2),
  calories     integer,
  protein_g    numeric(6,2),
  steps        integer,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (user_id, date)
);

create index health_metrics_user_date_idx on public.health_metrics (user_id, date desc);


-- ---------------------------------------------------------------- workouts --
-- Completed activity, usually mirrored from Apple Health.
create table public.workouts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,

  started_at       timestamptz not null,
  type             text not null,
  duration_sec     integer,
  distance_km      numeric(6,3),
  avg_hr           integer,
  pace_sec_per_km  integer,
  with_partner     boolean not null default false,
  source           text not null default 'health' check (source in ('health', 'manual')),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Idempotency key for re-sent Health exports.
  unique (user_id, started_at, type)
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);


-- -------------------------------------------------------------- benchmarks --
create table public.benchmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,

  date        date not null,
  name        text not null,
  value       numeric(8,2) not null,
  unit        text not null,
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index benchmarks_user_name_date_idx on public.benchmarks (user_id, name, date desc);


-- ------------------------------------------------------------------ photos --
-- Files live in the private `photos` storage bucket; this is the index.
create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  date          date not null,
  week          integer,
  storage_path  text not null unique,
  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index photos_user_date_idx on public.photos (user_id, date desc);


-- ---------------------------------------------------------- weekly_reviews --
-- `proposed_changes` is the validated JSON from the weekly review job;
-- `decisions` records which ones were accepted or rejected.
create table public.weekly_reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  week_start        date not null,
  week              integer not null,
  summary           text,
  stats             jsonb not null default '{}'::jsonb,
  proposed_changes  jsonb not null default '[]'::jsonb,
  decisions         jsonb not null default '[]'::jsonb,

  status            text not null default 'pending'
                    check (status in ('pending', 'applied', 'rejected', 'partial')),
  applied_at        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (user_id, week_start)
);

create index weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_start desc);


-- ------------------------------------------------- updated_at + RLS, all --
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'plan_sessions', 'exercise_logs', 'daily_checkins',
    'health_metrics', 'workouts', 'benchmarks', 'photos', 'weekly_reviews'
  ]
  loop
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);

    execute format('alter table public.%I enable row level security', t);

    -- auth.uid() is wrapped in a select so Postgres evaluates it once per
    -- statement rather than once per row.
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      t || '_own_rows', t);
  end loop;
end;
$$;
