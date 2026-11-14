-- ============================================================================
-- 007_session_sets_fix.sql — Reparar la tabla `session_sets`
--
-- Contexto: al ejecutar 006, las tablas workout_sessions, session_participants
-- y session_exercises se crearon, pero `session_sets` no aparece en la API
-- (error PGRST205: "Could not find the table ... in the schema cache").
--
-- Este archivo crea SOLO esa tabla, con sus políticas y permisos. Es
-- idempotente: si ya existe, no la duplica y solo refresca la caché.
--
-- Ejecutar en Supabase → SQL Editor. Si da un error, copiarlo completo.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  participant_id uuid not null references public.session_participants (id) on delete cascade,
  set_number integer not null,
  target_weight numeric,
  target_reps integer,
  target_time_seconds integer,
  actual_weight numeric,
  actual_reps integer,
  actual_time_seconds integer,
  status text not null default 'pendiente',
  completed_at timestamptz,
  -- Identificador único de la operación: evita duplicados si se reintenta.
  client_operation_id uuid not null,
  constraint session_sets_set_number_check check (set_number >= 1),
  constraint session_sets_target_weight_check
    check (target_weight is null or target_weight >= 0),
  constraint session_sets_target_reps_check
    check (target_reps is null or target_reps >= 0),
  constraint session_sets_target_time_check
    check (target_time_seconds is null or target_time_seconds >= 0),
  constraint session_sets_actual_weight_check
    check (actual_weight is null or actual_weight >= 0),
  constraint session_sets_actual_reps_check
    check (actual_reps is null or actual_reps >= 0),
  constraint session_sets_actual_time_check
    check (actual_time_seconds is null or actual_time_seconds >= 0),
  constraint session_sets_status_check
    check (status in ('pendiente', 'completada', 'omitida')),
  constraint session_sets_unique_number
    unique (session_exercise_id, participant_id, set_number),
  constraint session_sets_unique_operation unique (client_operation_id)
);

alter table public.session_sets enable row level security;

-- Las políticas suben hasta workout_sessions para comprobar el dueño.
drop policy if exists "session_sets_select_own" on public.session_sets;
create policy "session_sets_select_own" on public.session_sets for select to authenticated
  using (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_sets_insert_own" on public.session_sets;
create policy "session_sets_insert_own" on public.session_sets for insert to authenticated
  with check (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_sets_update_own" on public.session_sets;
create policy "session_sets_update_own" on public.session_sets for update to authenticated
  using (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ));

revoke all on public.session_sets from anon;
grant select, insert, update on public.session_sets to authenticated;

-- Refresca la caché de PostgREST para que la API vea la tabla al instante.
notify pgrst, 'reload schema';
