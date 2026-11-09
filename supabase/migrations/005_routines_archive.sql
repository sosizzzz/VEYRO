-- ============================================================================
-- 005_routines_archive.sql — Archivar rutinas (decisión aprobada)
--
-- Añade `archived_at` a `routines` para ocultar rutinas sin borrarlas.
-- NULL = activa (visible). Con fecha = archivada (oculta del listado normal,
-- recuperable, y NO disponible para iniciar entrenamientos nuevos).
--
-- Por qué no se borra: igual que los ejercicios (IN-002). Cuando existan
-- sesiones/historial, conservar la rutina evita romper referencias.
--
-- Ejecutar en Supabase → SQL Editor después de 004.
-- ============================================================================

-- 1) Columna de archivado: NULL significa "activa".
alter table public.routines
  add column if not exists archived_at timestamptz;

comment on column public.routines.archived_at is
  'NULL = rutina activa. Con fecha = archivada (oculta, recuperable, no iniciable).';

-- 2) Índice para filtrar rápido por usuario y estado (activas/archivadas).
create index if not exists routines_owner_archived_idx
  on public.routines (owner_id, archived_at);

-- No se añade permiso DELETE: archivar es un UPDATE de archived_at (ya permitido).
-- Comprobación:
-- select id, name, archived_at from public.routines limit 10;
