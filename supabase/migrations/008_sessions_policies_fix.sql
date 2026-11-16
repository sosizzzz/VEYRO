-- ============================================================================
-- 008_sessions_policies_fix.sql — Reparar seguridad de las tablas de sesión
--
-- Por qué existe:
-- La migración 006 se cortó al crear `session_sets` (por eso hizo falta la
-- 007). Eso significa que las órdenes que venían DESPUÉS —activar RLS, crear
-- las políticas y ajustar permisos— puede que nunca se ejecutaran.
--
-- Sin esas políticas, al empezar un entrenamiento Supabase puede responder
-- "new row violates row-level security policy" o "permission denied".
--
-- Este archivo vuelve a dejar las 4 tablas como debían quedar. Es idempotente:
-- se puede ejecutar varias veces sin duplicar nada.
--
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================================

-- 1) Asegurar columnas que pudieran faltar si la 006 se ejecutó a medias.
alter table public.workout_sessions
  add column if not exists rest_timer_ends_at timestamptz;

-- La restricción del temporizador se añade solo si no existe (PostgreSQL no
-- permite "add constraint if not exists" directamente).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_sessions_rest_ends_check'
  ) then
    alter table public.workout_sessions
      add constraint workout_sessions_rest_ends_check
      check (
        (rest_timer_state = 'corriendo' and rest_timer_ends_at is not null)
        or (rest_timer_state <> 'corriendo' and rest_timer_ends_at is null)
      );
  end if;
end $$;

-- 2) Activar RLS en las cuatro tablas.
alter table public.workout_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;

-- 3) Políticas de la sesión (solo su dueño).
drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own" on public.workout_sessions
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own" on public.workout_sessions
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- 4) Participantes: se comprueba el dueño subiendo hasta workout_sessions.
drop policy if exists "session_participants_select_own" on public.session_participants;
create policy "session_participants_select_own" on public.session_participants
  for select to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_participants_insert_own" on public.session_participants;
create policy "session_participants_insert_own" on public.session_participants
  for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_participants_update_own" on public.session_participants;
create policy "session_participants_update_own" on public.session_participants
  for update to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

-- 5) Ejercicios de la sesión.
drop policy if exists "session_exercises_select_own" on public.session_exercises;
create policy "session_exercises_select_own" on public.session_exercises
  for select to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_exercises_insert_own" on public.session_exercises;
create policy "session_exercises_insert_own" on public.session_exercises
  for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_exercises_update_own" on public.session_exercises;
create policy "session_exercises_update_own" on public.session_exercises
  for update to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

-- 6) Series.
drop policy if exists "session_sets_select_own" on public.session_sets;
create policy "session_sets_select_own" on public.session_sets
  for select to authenticated
  using (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_sets_insert_own" on public.session_sets;
create policy "session_sets_insert_own" on public.session_sets
  for insert to authenticated
  with check (exists (
    select 1
    from public.session_exercises e
    join public.workout_sessions s on s.id = e.session_id
    where e.id = session_exercise_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_sets_update_own" on public.session_sets;
create policy "session_sets_update_own" on public.session_sets
  for update to authenticated
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

-- 7) Permisos: la clave anónima no toca sesiones; el usuario autenticado sí.
revoke all on public.workout_sessions, public.session_participants,
  public.session_exercises, public.session_sets from anon;

grant select, insert, update on public.workout_sessions to authenticated;
grant select, insert, update on public.session_participants to authenticated;
grant select, insert, update on public.session_exercises to authenticated;
grant select, insert, update on public.session_sets to authenticated;

-- 8) Refrescar la caché de la API.
notify pgrst, 'reload schema';
