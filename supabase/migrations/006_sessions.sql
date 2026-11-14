-- ============================================================================
-- 006_sessions.sql — Sesiones de entrenamiento (contrato CT-01)
--
-- Crea las 4 tablas que guardan un entrenamiento:
--   workout_sessions      → la sesión (estado, inicio, temporizador)
--   session_participants  → quién entrena (en el MVP, una sola fila)
--   session_exercises     → la "foto" de los ejercicios de la rutina
--   session_sets          → objetivos y resultados de cada serie
--
-- Ejecutar en Supabase → SQL Editor después de 005.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1) Sesión
-- ----------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- La rutina de origen. `restrict` impide borrar una rutina que ya tiene
  -- sesiones: el historial quedaría roto. Por eso las rutinas se archivan
  -- (005) en lugar de borrarse.
  routine_id uuid not null references public.routines (id) on delete restrict,
  mode text not null default 'individual',
  status text not null default 'en_curso',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- Sin clave foránea a propósito: `session_participants` ya apunta a la
  -- sesión y una referencia mutua obligaría a insertar las dos filas a la vez.
  -- El servicio comprueba que el participante pertenece a esta sesión.
  current_participant_id uuid,
  rest_timer_seconds integer not null default 60,
  rest_timer_state text not null default 'detenido',
  rest_timer_remaining integer not null default 60,
  -- Hora de fin del descanso mientras corre. Permite recalcular el tiempo si
  -- el móvil se apaga (WORKFLOW.md §6). NULL cuando está detenido o pausado.
  rest_timer_ends_at timestamptz,
  constraint workout_sessions_mode_check
    check (mode in ('individual', 'compartida')),
  constraint workout_sessions_status_check
    check (status in ('en_curso', 'finalizada', 'cancelada')),
  constraint workout_sessions_rest_state_check
    check (rest_timer_state in ('detenido', 'corriendo', 'pausado')),
  constraint workout_sessions_rest_seconds_check
    check (rest_timer_seconds between 1 and 3600),
  constraint workout_sessions_rest_remaining_check
    check (rest_timer_remaining >= 0),
  -- Si corre, debe existir una hora de fin; si no corre, no debe haberla.
  constraint workout_sessions_rest_ends_check
    check (
      (rest_timer_state = 'corriendo' and rest_timer_ends_at is not null)
      or (rest_timer_state <> 'corriendo' and rest_timer_ends_at is null)
    ),
  -- Una sesión no puede terminar antes de empezar.
  constraint workout_sessions_finished_after_started_check
    check (finished_at is null or finished_at >= started_at)
);

-- ----------------------------------------------------------------------------
-- 2) Participantes (en el MVP, exactamente uno por sesión)
-- ----------------------------------------------------------------------------
create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Orden de turno: 1, 2, 3… En el MVP siempre 1.
  position integer not null,
  constraint session_participants_position_check check (position >= 1),
  constraint session_participants_unique_position unique (session_id, position)
);

-- ----------------------------------------------------------------------------
-- 3) Ejercicios dentro de la sesión (la foto)
-- ----------------------------------------------------------------------------
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  -- `restrict`: no se puede borrar un ejercicio que ya aparece en una sesión.
  -- Los ejercicios se archivan, así que esto no molesta en el uso normal.
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  -- Copias del momento de empezar: si luego se renombra o archiva el
  -- ejercicio, el historial sigue explicando qué se entrenó.
  exercise_name text not null,
  primary_muscles text[] not null,
  icon text,
  position integer not null,
  status text not null default 'pendiente',
  constraint session_exercises_position_check check (position >= 1),
  constraint session_exercises_status_check
    check (status in ('pendiente', 'saltado', 'omitido', 'completado')),
  constraint session_exercises_name_length_check
    check (char_length(trim(exercise_name)) between 1 and 120),
  -- Igual que en el catálogo: entre 1 y 3 músculos principales.
  constraint session_exercises_muscles_count_check
    check (cardinality(primary_muscles) between 1 and 3),
  constraint session_exercises_unique_position unique (session_id, position)
);

-- ----------------------------------------------------------------------------
-- 4) Series: objetivo copiado + resultado real
-- ----------------------------------------------------------------------------
create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  -- Quién hizo la serie. En el MVP coincide con el dueño de la sesión.
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
  -- Identificador único de la operación. Si el móvil reintenta el guardado,
  -- el servidor rechaza el duplicado gracias a la restricción UNIQUE.
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
  -- Una serie no puede repetirse dentro del mismo ejercicio y participante.
  constraint session_sets_unique_number
    unique (session_exercise_id, participant_id, set_number),
  -- Antiduplicados de sincronización: dos filas no pueden compartir operación.
  constraint session_sets_unique_operation unique (client_operation_id)
);

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
-- Las restricciones UNIQUE ya crean índices para sus columnas, así que solo
-- añadimos los que faltan para las consultas habituales.
create index if not exists workout_sessions_owner_started_idx
  on public.workout_sessions (owner_id, started_at desc);
create index if not exists session_participants_user_idx
  on public.session_participants (user_id);

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security): cada usuario solo ve y escribe lo suyo.
--
-- En las tablas hijas no hay `owner_id`; la propiedad se comprueba subiendo
-- hasta `workout_sessions.owner_id`. En el MVP el dueño de la sesión es el
-- único participante. Cuando existan sesiones compartidas, estas políticas se
-- ampliarán en otra migración (no se toca esta).
-- ----------------------------------------------------------------------------
alter table public.workout_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;

-- workout_sessions -----------------------------------------------------------
drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own" on public.workout_sessions for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own" on public.workout_sessions for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own" on public.workout_sessions for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- No hay política de DELETE: una sesión se cancela (status = 'cancelada'),
-- no se borra. Así nunca desaparece del historial por accidente.

-- session_participants -------------------------------------------------------
drop policy if exists "session_participants_select_own" on public.session_participants;
create policy "session_participants_select_own" on public.session_participants for select to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_participants_insert_own" on public.session_participants;
create policy "session_participants_insert_own" on public.session_participants for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_participants_update_own" on public.session_participants;
create policy "session_participants_update_own" on public.session_participants for update to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

-- session_exercises ----------------------------------------------------------
drop policy if exists "session_exercises_select_own" on public.session_exercises;
create policy "session_exercises_select_own" on public.session_exercises for select to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_exercises_insert_own" on public.session_exercises;
create policy "session_exercises_insert_own" on public.session_exercises for insert to authenticated
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "session_exercises_update_own" on public.session_exercises;
create policy "session_exercises_update_own" on public.session_exercises for update to authenticated
  using (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and s.owner_id = (select auth.uid())
  ));

-- session_sets ---------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Permisos
-- ----------------------------------------------------------------------------
revoke all on public.workout_sessions, public.session_participants,
  public.session_exercises, public.session_sets from anon;

grant select, insert, update on public.workout_sessions to authenticated;
grant select, insert, update on public.session_participants to authenticated;
grant select, insert, update on public.session_exercises to authenticated;
grant select, insert, update on public.session_sets to authenticated;
