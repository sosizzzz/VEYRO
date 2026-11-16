/**
 * Módulo de sesiones de entrenamiento.
 *
 * Las pantallas importan desde aquí (`@/modules/workouts`) y no desde los
 * archivos internos. Si mañana cambia la organización, solo se toca el índice.
 */
export {
  cancelWorkoutSession,
  finishWorkoutSession,
  getActiveWorkoutSession,
  getWorkoutSessionDetail,
  saveSessionExerciseStatus,
  saveSessionSetResult,
  saveWorkoutSession,
  startSessionFromRoutine,
  type StartSessionOptions,
} from './services/sessionService';
export {
  buildSyncOperations,
  setChanged,
} from './services/syncOperations';
export {
  checkInternetConnection,
  flushSyncQueue,
  getSyncStatus,
} from './services/syncService';

export type { WorkoutSessionDetail } from '@/types/workout';
export type {
  SyncOperation,
  SyncState,
  SyncStatus,
} from '@/types/sync';
