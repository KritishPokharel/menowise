-- Enable extensions
create extension if not exists "pgcrypto";

-- users_profile
create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  birth_year int,
  age int,
  lifecycle_stage text check (lifecycle_stage in ('pregnant','pre-menopause','perimenopause','post-menopause')),
  children_count int default 0,
  cycle_length int,
  period_length int,
  mood_baseline text,
  preferred_language text default 'en',
  created_at timestamptz default now()
);

-- health_preferences
create table if not exists public.health_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  show_bp boolean default true,
  show_weight boolean default true,
  show_sleep boolean default true,
  show_mood boolean default true
);

-- health_logs
create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  bp_systolic int,
  bp_diastolic int,
  weight numeric(6,2),
  sleep_hours numeric(4,2),
  mood_score int check (mood_score between 0 and 100)
);

create index if not exists health_logs_user_date_idx on public.health_logs(user_id, date);

-- symptoms
create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symptom_name text not null,
  intensity int check (intensity between 1 and 5),
  created_at timestamptz default now()
);

create index if not exists symptoms_user_created_idx on public.symptoms(user_id, created_at desc);

-- RLS
alter table public.users_profile enable row level security;
alter table public.health_preferences enable row level security;
alter table public.health_logs enable row level security;
alter table public.symptoms enable row level security;

-- Policies: read own rows
create policy "users_profile_select_own"
on public.users_profile for select
using (auth.uid() = id);

create policy "health_preferences_select_own"
on public.health_preferences for select
using (auth.uid() = user_id);

create policy "health_logs_select_own"
on public.health_logs for select
using (auth.uid() = user_id);

create policy "symptoms_select_own"
on public.symptoms for select
using (auth.uid() = user_id);

-- Policies: insert own rows
create policy "users_profile_insert_own"
on public.users_profile for insert
with check (auth.uid() = id);

create policy "health_preferences_insert_own"
on public.health_preferences for insert
with check (auth.uid() = user_id);

create policy "health_logs_insert_own"
on public.health_logs for insert
with check (auth.uid() = user_id);

create policy "symptoms_insert_own"
on public.symptoms for insert
with check (auth.uid() = user_id);

-- Policies: update own rows
create policy "users_profile_update_own"
on public.users_profile for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "health_preferences_update_own"
on public.health_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "health_logs_update_own"
on public.health_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "symptoms_update_own"
on public.symptoms for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional delete own rows
create policy "health_logs_delete_own"
on public.health_logs for delete
using (auth.uid() = user_id);

create policy "symptoms_delete_own"
on public.symptoms for delete
using (auth.uid() = user_id);

-- Useful queries
-- Upsert profile
-- insert into public.users_profile (id, full_name, birth_year, age, lifecycle_stage, children_count)
-- values (auth.uid(), 'Jane Doe', 1983, 43, 'perimenopause', 2)
-- on conflict (id) do update
-- set full_name = excluded.full_name,
--     birth_year = excluded.birth_year,
--     age = excluded.age,
--     lifecycle_stage = excluded.lifecycle_stage,
--     children_count = excluded.children_count;

-- Upsert preferences
-- insert into public.health_preferences (user_id, show_bp, show_weight, show_sleep, show_mood)
-- values (auth.uid(), true, true, false, true)
-- on conflict (user_id) do update
-- set show_bp = excluded.show_bp,
--     show_weight = excluded.show_weight,
--     show_sleep = excluded.show_sleep,
--     show_mood = excluded.show_mood;

-- Insert health log
-- insert into public.health_logs (user_id, date, bp_systolic, bp_diastolic, weight, sleep_hours, mood_score)
-- values (auth.uid(), current_date, 120, 80, 63.2, 7.5, 74);

-- Insert symptom
-- insert into public.symptoms (user_id, symptom_name, intensity)
-- values (auth.uid(), 'fatigue', 3);
