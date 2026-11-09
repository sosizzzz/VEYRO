/**
 * Tipos del módulo de ejercicios.
 *
 * Un ejercicio es una plantilla (p. ej. "Press banca") que el usuario guarda en
 * su biblioteca. Las rutinas y sesiones hacen referencia a ejercicios, pero al
 * iniciar una sesión se copia la información ("foto") para no depender de cambios
 * futuros.
 */

/** Fila de la tabla `public.exercises`. */
export type Exercise = {
  id: string;
  /** Dueño del ejercicio (id del perfil/usuario). */
  owner_id: string;
  name: string;
  description: string | null;
  /** Identificador/nombre del icono (opcional en MVP). */
  icon: string | null;
  /** Músculos principales (mínimo 1, máximo 3), valores del catálogo aprobado. */
  primary_muscles: string[];
  /** Si tiene fecha, el ejercicio está archivado (no borrado). NULL = activo. */
  archived_at: string | null;
  /** Procedencia de una copia (uso futuro, informativo). */
  source_exercise_id: string | null;
  created_at: string;
};
