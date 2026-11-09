-- ============================================================================
-- 002_exercises.sql — Biblioteca de ejercicios (Fase 2)
--
-- Crea la tabla `exercises` y su seguridad (RLS).
-- Cada ejercicio pertenece a un usuario (owner). Se archiva con `archived_at`
-- (no se borra) para conservar el historial.
--
-- Ejecutar en Supabase → SQL Editor. Idempotente en lo posible.
-- ============================================================================

-- Extensión para generar UUIDs en el servidor si el cliente no envía id.
create extension if not exists "pgcrypto";

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),

  -- Dueño: referencia al perfil/usuario. Si se elimina el usuario, sus
  -- ejercicios se eliminan en cascada (igual que profiles).
  owner_id uuid not null references public.profiles (id) on delete cascade,

  name text not null,
  description text,
  icon text,

  -- Músculo principal: debe ser uno de los valores del catálogo aprobado (MVP).
  primary_muscle text not null,

  -- NULL = activo. Con fecha = archivado (sigue existiendo para historial/rutinas).
  archived_at timestamptz,

  -- Procedencia de una copia (uso futuro). No sincroniza con el original.
  source_exercise_id uuid references public.exercises (id) on delete set null,

  created_at timestamptz not null default now(),

  constraint exercises_name_length check (char_length(trim(name)) between 2 and 80),
  constraint exercises_description_length check (description is null or char_length(description) <= 500),
  constraint exercises_primary_muscle_check check (
    primary_muscle in (
      'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos',
      'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Aductores', 'Gemelos',
      'Core', 'Lumbar',
      'Cuerpo completo', 'Cardio', 'Otros'
    )
  )
);

comment on table public.exercises is
  'Biblioteca de ejercicios por usuario. Archivado = archived_at no nulo.';

-- Índices para listados y búsqueda.
create index if not exists exercises_owner_archived_idx
  on public.exercises (owner_id, archived_at);
create index if not exists exercises_owner_name_idx
  on public.exercises (owner_id, name);

-- ----------------------------------------------------------------------------
-- RLS: cada usuario solo accede a sus propios ejercicios.
-- ----------------------------------------------------------------------------
alter table public.exercises enable row level security;

drop policy if exists "exercises_select_own" on public.exercises;
create policy "exercises_select_own"
  on public.exercises
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own"
  on public.exercises
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own"
  on public.exercises
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Sin DELETE en MVP: se archiva (UPDATE de archived_at). Permisos explícitos.
revoke all on public.exercises from anon;
grant select, insert, update on public.exercises to authenticated;
revoke delete on public.exercises from authenticated;

-- Comprobación rápida:
-- select relname, relrowsecurity from pg_class where relname = 'exercises';
-- select id, name, primary_muscle, archived_at from public.exercises limit 10;
