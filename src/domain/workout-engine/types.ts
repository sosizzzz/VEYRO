/**
 * Tipos del motor de sesión (Fase 5 · contrato CT-01).
 *
 * El motor es **lógica pura**: no importa React, ni Expo, ni Supabase. Recibe
 * un estado y un evento, y devuelve un estado nuevo. Eso permite probarlo con
 * tests rápidos y garantiza que la pantalla no decide nada por su cuenta.
 */
import type {
  SessionExerciseWithSets,
  SessionParticipant,
  WorkoutSession,
} from '../../types/workout';

/**
 * Todo lo que el motor necesita saber de una sesión.
 *
 * `currentExerciseId` es el ejercicio que se está mostrando. No está en la
 * base de datos porque se puede deducir de los estados; se guarda en el móvil
 * para recuperar exactamente la misma posición tras cerrar la app.
 */
export type WorkoutEngineState = {
  session: WorkoutSession;
  participants: SessionParticipant[];
  exercises: SessionExerciseWithSets[];
  currentExerciseId: string | null;
};

/** Evento: el usuario registra el resultado real de una serie. */
export type SetCompletedEvent = {
  type: 'SET_COMPLETED';
  exerciseId: string;
  setId: string;
  actualWeight?: number | null;
  actualReps?: number | null;
  actualTimeSeconds?: number | null;
  /** Momento del registro, en ISO 8601. Se pasa desde fuera para poder testear. */
  completedAt: string;
};

/** Evento: el usuario decide no hacer una serie (queda registrada). */
export type SetOmittedEvent = {
  type: 'SET_OMITTED';
  exerciseId: string;
  setId: string;
};

/** Evento: el ejercicio se aparca temporalmente y sigue pendiente. */
export type ExerciseSkippedEvent = {
  type: 'EXERCISE_SKIPPED';
  exerciseId: string;
};

/** Evento: el ejercicio se descarta definitivamente en esta sesión. */
export type ExerciseOmittedEvent = {
  type: 'EXERCISE_OMITTED';
  exerciseId: string;
};

/** Evento: el usuario elige manualmente qué ejercicio hacer ahora. */
export type ExerciseSelectedEvent = {
  type: 'EXERCISE_SELECTED';
  exerciseId: string;
};

/** Evento: la sesión termina correctamente. */
export type SessionFinishedEvent = {
  type: 'SESSION_FINISHED';
  /** Momento de fin, en ISO 8601. */
  finishedAt: string;
};

/** Evento: la sesión se descarta. La confirmación es responsabilidad de la UI. */
export type SessionCanceledEvent = {
  type: 'SESSION_CANCELED';
};

/**
 * Lista cerrada de eventos del motor.
 *
 * Los del temporizador se añadirán en la tarea A-03, dentro de este mismo tipo.
 */
export type WorkoutEvent =
  | SetCompletedEvent
  | SetOmittedEvent
  | ExerciseSkippedEvent
  | ExerciseOmittedEvent
  | ExerciseSelectedEvent
  | SessionFinishedEvent
  | SessionCanceledEvent;

/**
 * Motivos por los que una acción puede rechazarse.
 *
 * Se devuelven como código (no como texto) para que la interfaz decida el
 * mensaje y el idioma. `ENGINE_ERROR_MESSAGES` trae una traducción por defecto.
 */
export type WorkoutEngineError =
  | 'SESSION_NOT_IN_PROGRESS'
  | 'EXERCISE_NOT_FOUND'
  | 'SET_NOT_FOUND'
  | 'EXERCISE_NOT_AVAILABLE'
  | 'SET_NOT_PENDING'
  | 'PENDING_EXERCISES';

/**
 * Resultado de aplicar un evento.
 *
 * Siempre hay que comprobar `ok`: si es `false`, el estado no cambió y
 * `error` explica por qué.
 */
export type WorkoutEngineResult =
  | { ok: true; state: WorkoutEngineState }
  | { ok: false; error: WorkoutEngineError };

/** Mensajes en español para mostrar en la interfaz. */
export const ENGINE_ERROR_MESSAGES: Record<WorkoutEngineError, string> = {
  SESSION_NOT_IN_PROGRESS: 'La sesión ya no está en curso.',
  EXERCISE_NOT_FOUND: 'El ejercicio no pertenece a esta sesión.',
  SET_NOT_FOUND: 'La serie no pertenece a este ejercicio.',
  EXERCISE_NOT_AVAILABLE: 'Ese ejercicio ya está completado u omitido.',
  SET_NOT_PENDING: 'Esa serie ya se había registrado.',
  PENDING_EXERCISES: 'Todavía quedan ejercicios pendientes.',
};
