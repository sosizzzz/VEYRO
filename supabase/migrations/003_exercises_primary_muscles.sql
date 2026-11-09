-- ============================================================================
-- 003_exercises_primary_muscles.sql — Músculos principales múltiples (1–3)
--
-- Cambia `primary_muscle` (un solo valor) por `primary_muscles` (lista de 1 a 3).
-- Ejecutar en Supabase → SQL Editor después de 002.
-- ============================================================================

-- 1) Añadir la nueva columna (lista de textos).
alter table public.exercises
  add column if not exists primary_muscles text[] null;

-- 2) Migrar datos desde la columna antigua, si todavía existe.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'exercises' and column_name = 'primary_muscle'
  ) then
    update public.exercises
    set primary_muscles = array[primary_muscle]
    where primary_muscles is null and primary_muscle is not null;
  end if;
end $$;

-- 3) Valor por defecto seguro para filas raras (no debería haber) y NOT NULL.
update public.exercises
set primary_muscles = array['Otros']::text[]
where primary_muscles is null or cardinality(primary_muscles) = 0;

alter table public.exercises
  alter column primary_muscles set not null;

-- 4) Restricciones: entre 1 y 3 músculos, y todos dentro del catálogo aprobado.
alter table public.exercises drop constraint if exists exercises_primary_muscles_count_check;
alter table public.exercises
  add constraint exercises_primary_muscles_count_check
  check (cardinality(primary_muscles) between 1 and 3);

alter table public.exercises drop constraint if exists exercises_primary_muscles_values_check;
alter table public.exercises
  add constraint exercises_primary_muscles_values_check
  check (
    primary_muscles <@ array[
      'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos',
      'Cuádriceps', 'Isquiosurales', 'Glúteos', 'Aductores', 'Gemelos',
      'Core', 'Lumbar',
      'Cuerpo completo', 'Cardio', 'Otros'
    ]::text[]
  );

-- 5) Quitar la columna antigua y su check (si existen).
alter table public.exercises drop constraint if exists exercises_primary_muscle_check;
alter table public.exercises drop column if exists primary_muscle;

-- Comprobación:
-- select id, name, primary_muscles from public.exercises limit 10;
