/** Tipos de rutinas (Fase 3). */

export type Routine = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  source_routine_id: string | null;
  /** NULL = activa. Con fecha = archivada (oculta, recuperable, no iniciable). */
  archived_at: string | null;
  created_at: string;
};

export type RoutineExercise = {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
};

export type RoutineSetTarget = {
  id: string;
  routine_exercise_id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  target_time_seconds: number | null;
};

/** Día planificado: 1=lunes ... 7=domingo (ISO). */
export type RoutineScheduleDay = {
  routine_id: string;
  weekday: number;
};

/** Para formularios/UI: ejercicio dentro de la rutina con sus objetivos. */
export type RoutineExerciseDraft = {
  exercise_id: string;
  /** Datos de apoyo para mostrar en la UI (no se guardan en routine_exercises). */
  exercise_name?: string;
  sets: {
    set_number: number;
    target_weight?: number | null;
    target_reps?: number | null;
    target_time_seconds?: number | null;
  }[];
};

export type RoutineDraft = {
  name: string;
  description?: string;
  weekdays: number[]; // 1-7
  exercises: RoutineExerciseDraft[];
};