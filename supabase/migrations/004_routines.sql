-- ============================================================================
-- 004_routines.sql — Rutinas (Fase 3)
--
-- Tablas: routines, routine_exercises, routine_set_targets, routine_schedule_days.
-- Todo pertenece a un usuario (owner vía routine). RLS activo.
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1) Rutina
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  source_routine_id uuid references public.routines (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint routines_name_length check (char_length(trim(name)) between 2 and 80),
  constraint routines_description_length check (description is null or char_length(description) <= 500)
);

-- 2) Ejercicios dentro de la rutina (ordenados)
create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position integer not null,
  constraint routine_exercises_position_check check (position >= 1),
  constraint routine_exercises_unique_position unique (routine_id, position)
);

-- 3) Objetivos por serie
create table if not exists public.routine_set_targets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  set_number integer not null,
  target_weight numeric,
  target_reps integer,
  target_time_seconds integer,
  constraint routine_set_targets_set_number_check check (set_number >= 1),
  constraint routine_set_targets_unique_set unique (routine_exercise_id, set_number),
  constraint routine_set_targets_reps_check check (target_reps is null or target_reps >= 0),
  constraint routine_set_targets_time_check check (target_time_seconds is null or target_time_seconds >= 0)
);

-- 4) Días planificados (1=lunes ... 7=domingo ISO)
create table if not exists public.routine_schedule_days (
  routine_id uuid not null references public.routines (id) on delete cascade,
  weekday smallint not null,
  primary key (routine_id, weekday),
  constraint routine_schedule_days_weekday_check check (weekday between 1 and 7)
);

create index if not exists routines_owner_idx on public.routines (owner_id);
create index if not exists routine_exercises_routine_idx on public.routine_exercises (routine_id, position);
create index if not exists routine_set_targets_exercise_idx on public.routine_set_targets (routine_exercise_id, set_number);
create index if not exists routine_schedule_days_weekday_idx on public.routine_schedule_days (weekday, routine_id);

-- ----------------------------------------------------------------------------
-- RLS (propiedad vía routines.owner_id)
-- ----------------------------------------------------------------------------
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_set_targets enable row level security;
alter table public.routine_schedule_days enable row level security;

-- routines
drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own" on public.routines for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own" on public.routines for insert to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own" on public.routines for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- routine_exercises (a través de la rutina)
drop policy if exists "routine_exercises_select_own" on public.routine_exercises;
create policy "routine_exercises_select_own" on public.routine_exercises for select to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));
drop policy if exists "routine_exercises_insert_own" on public.routine_exercises;
create policy "routine_exercises_insert_own" on public.routine_exercises for insert to authenticated
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));
drop policy if exists "routine_exercises_update_own" on public.routine_exercises;
create policy "routine_exercises_update_own" on public.routine_exercises for update to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));
drop policy if exists "routine_exercises_delete_own" on public.routine_exercises;
create policy "routine_exercises_delete_own" on public.routine_exercises for delete to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));

-- routine_set_targets
drop policy if exists "routine_set_targets_select_own" on public.routine_set_targets;
create policy "routine_set_targets_select_own" on public.routine_set_targets for select to authenticated
  using (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and r.owner_id = (select auth.uid())
  ));
drop policy if exists "routine_set_targets_write_own" on public.routine_set_targets;
create policy "routine_set_targets_write_own" on public.routine_set_targets for all to authenticated
  using (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and r.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routine_exercises re join public.routines r on r.id = re.routine_id
    where re.id = routine_exercise_id and r.owner_id = (select auth.uid())
  ));

-- routine_schedule_days
drop policy if exists "routine_schedule_days_select_own" on public.routine_schedule_days;
create policy "routine_schedule_days_select_own" on public.routine_schedule_days for select to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));
drop policy if exists "routine_schedule_days_write_own" on public.routine_schedule_days;
create policy "routine_schedule_days_write_own" on public.routine_schedule_days for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.owner_id = (select auth.uid())));

revoke all on public.routines, public.routine_exercises, public.routine_set_targets, public.routine_schedule_days from anon;
grant select, insert, update on public.routines to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.routine_set_targets to authenticated;
grant select, insert, update, delete on public.routine_schedule_days to authenticated;
