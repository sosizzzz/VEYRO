/**
 * Convierte la diferencia entre dos estados del motor en operaciones de cola.
 *
 * ¿Por qué se compara el estado "antes" y el "después"?
 * Porque el motor es puro: devuelve un objeto nuevo con todo cambiado de sitio,
 * pero solo unos pocos campos han cambiado de verdad. Enviar todo en cada
 * pulsación llenaría la cola de trabajo inútil. Aquí se detecta lo mínimo y se
 * convierte en operaciones con id estable (idempotentes).
 *
 * Esta función no toca Supabase ni React: es lógica pura y se puede testear.
 */
import type { WorkoutEngineState } from '@/domain/workout-engine';
import type { SessionSet, WorkoutSession } from '@/types/workout';
import type { SyncOperation } from '@/types/sync';

/** Compara los campos de la sesión que se pueden modificar durante el entrenamiento. */
function sessionChanged(before: WorkoutSession, after: WorkoutSession): boolean {
  return (
    before.status !== after.status ||
    before.finished_at !== after.finished_at ||
    before.current_participant_id !== after.current_participant_id ||
    before.rest_timer_seconds !== after.rest_timer_seconds ||
    before.rest_timer_state !== after.rest_timer_state ||
    before.rest_timer_remaining !== after.rest_timer_remaining ||
    before.rest_timer_ends_at !== after.rest_timer_ends_at
  );
}

/** ¿Cambió algún dato visible de la serie? */
export function setChanged(before: SessionSet, after: SessionSet): boolean {
  return (
    before.status !== after.status ||
    before.actual_weight !== after.actual_weight ||
    before.actual_reps !== after.actual_reps ||
    before.actual_time_seconds !== after.actual_time_seconds ||
    before.completed_at !== after.completed_at
  );
}

/**
 * Ejemplo de uso:
 * ```ts
 * const result = applyWorkoutEvent(state, evento);
 * if (result.ok) {
 *   const ops = buildSyncOperations(state, result.state);
 *   await enqueueSyncOperations(ops);
 *   await flushSyncQueue();
 * }
 * ```
 */
export function buildSyncOperations(
  before: WorkoutEngineState,
  after: WorkoutEngineState,
): SyncOperation[] {
  const ownerId = after.session.owner_id;
  const sessionId = after.session.id;
  const createdAt = new Date().toISOString();
  const operations: SyncOperation[] = [];

  // 1) Cabecera de la sesión: estado, turno y temporizador.
  if (sessionChanged(before.session, after.session)) {
    operations.push({
      id: `session:${sessionId}`,
      ownerId,
      sessionId,
      kind: 'session',
      payload: { session: after.session },
      createdAt,
      attempts: 0,
      lastError: null,
    });
  }

  // 2) Estados de ejercicios y resultados de series.
  for (const exercise of after.exercises) {
    const previousExercise = before.exercises.find((item) => item.id === exercise.id);

    if (previousExercise && previousExercise.status !== exercise.status) {
      operations.push({
        id: `exercise:${exercise.id}`,
        ownerId,
        sessionId,
        kind: 'exercise_status',
        payload: { exerciseId: exercise.id, status: exercise.status },
        createdAt,
        attempts: 0,
        lastError: null,
      });
    }

    for (const set of exercise.sets) {
      const previousSet = previousExercise?.sets.find((item) => item.id === set.id);
      if (previousSet && setChanged(previousSet, set)) {
        operations.push({
          id: `set:${set.id}`,
          ownerId,
          sessionId,
          kind: 'set_result',
          payload: { set },
          createdAt,
          attempts: 0,
          lastError: null,
        });
      }
    }
  }

  return operations;
}
