/**
 * Motor de sesión: lógica pura, sin React ni Supabase.
 *
 * Uso típico:
 * ```ts
 * let estado = createWorkoutEngineState(detalleSesion);
 * const resultado = applyWorkoutEvent(estado, {
 *   type: 'SET_COMPLETED',
 *   exerciseId,
 *   setId,
 *   actualWeight: 60,
 *   actualReps: 10,
 *   completedAt: new Date().toISOString(),
 * });
 * if (resultado.ok) estado = resultado.state;
 * ```
 */
export {
  applyWorkoutEvent,
  canFinish,
  createWorkoutEngineState,
  getNextExercise,
} from './engine';
export {
  ENGINE_ERROR_MESSAGES,
  type ExerciseOmittedEvent,
  type ExerciseSelectedEvent,
  type ExerciseSkippedEvent,
  type SessionCanceledEvent,
  type SessionFinishedEvent,
  type SetCompletedEvent,
  type SetOmittedEvent,
  type WorkoutEngineError,
  type WorkoutEngineResult,
  type WorkoutEngineState,
  type WorkoutEvent,
} from './types';
