/**
 * Motor de sesión (Fase 5).
 *
 * Reglas que implementa (ver WORKFLOW.md):
 * 1. Solo se puede actuar sobre una sesión `en_curso`.
 * 2. Al completar todas las series de un ejercicio, pasa a `completado` y se
 *    propone el siguiente.
 * 3. El siguiente es el primer ejercicio `pendiente` o `saltado` por el orden
 *    original de la rutina. Saltar no es omitir: lo saltado vuelve a la cola.
 * 4. Una sesión solo puede finalizar cuando no quedan ejercicios pendientes ni
 *    saltados. Cancelar siempre es posible (la confirmación es de la interfaz).
 *
 * Todas las funciones son **puras**: no modifican el estado recibido, sino que
 * devuelven uno nuevo. Así se puede comparar el antes y el después en tests y
 * deshacer cambios con facilidad en el futuro.
 */
import type {
  SessionExerciseWithSets,
  SessionSet,
  WorkoutSessionDetail,
} from '../../types/workout';

import type {
  WorkoutEngineError,
  WorkoutEngineResult,
  WorkoutEngineState,
  WorkoutEvent,
} from './types';

/** Crea una copia ordenada de los ejercicios sin tocar el objeto original. */
function cloneExercises(exercises: SessionExerciseWithSets[]): SessionExerciseWithSets[] {
  return exercises.map((exercise) => ({
    ...exercise,
    primary_muscles: [...exercise.primary_muscles],
    sets: exercise.sets.map((set) => ({ ...set })),
  }));
}

/** ¿Este ejercicio todavía se puede hacer? */
function isAvailable(exercise: SessionExerciseWithSets): boolean {
  return exercise.status === 'pendiente' || exercise.status === 'saltado';
}

/** ¿Todas sus series están completadas u omitidas? */
function allSetsResolved(exercise: SessionExerciseWithSets): boolean {
  return exercise.sets.every((set) => set.status !== 'pendiente');
}

/**
 * Elige el siguiente ejercicio pendiente o saltado por orden original.
 *
 * `excludeId` se usa al saltar: queremos proponer **otro**, no el que acaba de
 * aparcarse. Si no hay otro, se devuelve el mismo (es el único que queda).
 */
function pickNextExercise(
  exercises: SessionExerciseWithSets[],
  excludeId?: string,
): SessionExerciseWithSets | null {
  const candidates = [...exercises]
    .filter(isAvailable)
    .sort((a, b) => a.position - b.position);

  if (candidates.length === 0) return null;
  return candidates.find((exercise) => exercise.id !== excludeId) ?? candidates[0];
}

function ok(state: WorkoutEngineState): WorkoutEngineResult {
  return { ok: true, state };
}

function fail(error: WorkoutEngineError): WorkoutEngineResult {
  return { ok: false, error };
}

/**
 * Construye el estado inicial a partir del detalle de una sesión.
 *
 * Ejemplo:
 * ```ts
 * const state = createWorkoutEngineState(detail);
 * // state.currentExerciseId apunta al primer ejercicio pendiente.
 * ```
 */
export function createWorkoutEngineState(detail: WorkoutSessionDetail): WorkoutEngineState {
  // Separamos los campos propios de la sesión de las listas hijas.
  // `rest` es la sesión "pelada" (sin participantes ni ejercicios).
  const { participants, exercises, ...session } = detail;
  const clonedExercises = cloneExercises(exercises);
  const current = pickNextExercise(clonedExercises);

  return {
    session,
    participants: participants.map((participant) => ({ ...participant })),
    exercises: clonedExercises,
    currentExerciseId: current?.id ?? null,
  };
}

/**
 * Devuelve el ejercicio que toca mostrar.
 *
 * Primero respeta el ejercicio actual si todavía tiene series pendientes; si
 * no, aplica el orden original. Es la regla 4 de WORKFLOW.md.
 */
export function getNextExercise(state: WorkoutEngineState): SessionExerciseWithSets | null {
  const current = state.exercises.find((exercise) => exercise.id === state.currentExerciseId);
  if (current && isAvailable(current) && current.sets.some((set) => set.status === 'pendiente')) {
    return current;
  }
  return pickNextExercise(state.exercises);
}

/** ¿Se puede finalizar ya? No deben quedar ejercicios pendientes ni saltados. */
export function canFinish(state: WorkoutEngineState): boolean {
  return (
    state.session.status === 'en_curso' &&
    !state.exercises.some((exercise) => isAvailable(exercise))
  );
}

/** Sustituye un ejercicio por su versión actualizada. */
function replaceExercise(
  exercises: SessionExerciseWithSets[],
  exerciseId: string,
  updated: SessionExerciseWithSets,
): SessionExerciseWithSets[] {
  return exercises.map((exercise) => (exercise.id === exerciseId ? updated : exercise));
}

/** Aplica un evento y devuelve el estado nuevo (o un error comprensible). */
export function applyWorkoutEvent(
  state: WorkoutEngineState,
  event: WorkoutEvent,
): WorkoutEngineResult {
  if (state.session.status !== 'en_curso') {
    return fail('SESSION_NOT_IN_PROGRESS');
  }

  switch (event.type) {
    case 'SET_COMPLETED':
      return completeSet(state, event);
    case 'SET_OMITTED':
      return omitSet(state, event);
    case 'EXERCISE_SKIPPED':
      return skipExercise(state, event.exerciseId);
    case 'EXERCISE_OMITTED':
      return omitExercise(state, event.exerciseId);
    case 'EXERCISE_SELECTED':
      return selectExercise(state, event.exerciseId);
    case 'SESSION_FINISHED':
      return finishSession(state, event.finishedAt);
    case 'SESSION_CANCELED':
      return cancelSession(state);
  }
}

function completeSet(
  state: WorkoutEngineState,
  event: Extract<WorkoutEvent, { type: 'SET_COMPLETED' }>,
): WorkoutEngineResult {
  const exercise = state.exercises.find((item) => item.id === event.exerciseId);
  if (!exercise) return fail('EXERCISE_NOT_FOUND');
  if (exercise.status === 'completado' || exercise.status === 'omitido') {
    return fail('EXERCISE_NOT_AVAILABLE');
  }

  const set = exercise.sets.find((item) => item.id === event.setId);
  if (!set) return fail('SET_NOT_FOUND');
  if (set.status !== 'pendiente') return fail('SET_NOT_PENDING');

  // Solo se guarda el resultado de las métricas que tenían objetivo.
  // Si el ejercicio no pedía peso, no se inventa un peso aunque llegue uno.
  const completedSet: SessionSet = {
    ...set,
    status: 'completada',
    actual_weight: set.target_weight == null ? null : (event.actualWeight ?? null),
    actual_reps: set.target_reps == null ? null : (event.actualReps ?? null),
    actual_time_seconds:
      set.target_time_seconds == null ? null : (event.actualTimeSeconds ?? null),
    completed_at: event.completedAt,
  };

  const updatedSets = exercise.sets.map((item) => (item.id === completedSet.id ? completedSet : item));
  const status = allSetsResolved({ ...exercise, sets: updatedSets })
    ? 'completado'
    : exercise.status;
  const updatedExercise: SessionExerciseWithSets = { ...exercise, sets: updatedSets, status };

  const exercises = replaceExercise(state.exercises, exercise.id, updatedExercise);
  return ok(advanceIfNeeded(state, exercises, exercise.id));
}

function omitSet(
  state: WorkoutEngineState,
  event: Extract<WorkoutEvent, { type: 'SET_OMITTED' }>,
): WorkoutEngineResult {
  const exercise = state.exercises.find((item) => item.id === event.exerciseId);
  if (!exercise) return fail('EXERCISE_NOT_FOUND');
  if (exercise.status === 'completado' || exercise.status === 'omitido') {
    return fail('EXERCISE_NOT_AVAILABLE');
  }

  const set = exercise.sets.find((item) => item.id === event.setId);
  if (!set) return fail('SET_NOT_FOUND');
  if (set.status !== 'pendiente') return fail('SET_NOT_PENDING');

  const updatedSets = exercise.sets.map((item) =>
    item.id === set.id ? { ...item, status: 'omitida' as const } : item,
  );
  const status = allSetsResolved({ ...exercise, sets: updatedSets })
    ? 'completado'
    : exercise.status;
  const updatedExercise: SessionExerciseWithSets = { ...exercise, sets: updatedSets, status };

  const exercises = replaceExercise(state.exercises, exercise.id, updatedExercise);
  return ok(advanceIfNeeded(state, exercises, exercise.id));
}

function skipExercise(state: WorkoutEngineState, exerciseId: string): WorkoutEngineResult {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return fail('EXERCISE_NOT_FOUND');
  if (!isAvailable(exercise)) return fail('EXERCISE_NOT_AVAILABLE');

  const exercises = replaceExercise(state.exercises, exerciseId, {
    ...exercise,
    status: 'saltado',
  });

  // Si era el ejercicio actual, pasamos al siguiente. El saltado sigue en la
  // cola y volverá cuando no queden otros.
  const currentExerciseId =
    state.currentExerciseId === exerciseId
      ? (pickNextExercise(exercises, exerciseId)?.id ?? null)
      : state.currentExerciseId;

  return ok({ ...state, exercises, currentExerciseId });
}

function omitExercise(state: WorkoutEngineState, exerciseId: string): WorkoutEngineResult {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return fail('EXERCISE_NOT_FOUND');
  if (!isAvailable(exercise)) return fail('EXERCISE_NOT_AVAILABLE');

  const exercises = replaceExercise(state.exercises, exerciseId, {
    ...exercise,
    status: 'omitido',
  });

  const currentExerciseId =
    state.currentExerciseId === exerciseId
      ? (pickNextExercise(exercises, exerciseId)?.id ?? null)
      : state.currentExerciseId;

  return ok({ ...state, exercises, currentExerciseId });
}

function selectExercise(state: WorkoutEngineState, exerciseId: string): WorkoutEngineResult {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return fail('EXERCISE_NOT_FOUND');
  if (!isAvailable(exercise)) return fail('EXERCISE_NOT_AVAILABLE');

  return ok({ ...state, currentExerciseId: exerciseId });
}

function finishSession(state: WorkoutEngineState, finishedAt: string): WorkoutEngineResult {
  if (!canFinish(state)) return fail('PENDING_EXERCISES');

  return ok({
    ...state,
    session: { ...state.session, status: 'finalizada', finished_at: finishedAt },
    currentExerciseId: null,
  });
}

function cancelSession(state: WorkoutEngineState): WorkoutEngineResult {
  return ok({
    ...state,
    session: { ...state.session, status: 'cancelada' },
    currentExerciseId: null,
  });
}

/**
 * Tras completar u omitir una serie, decide si hay que cambiar de ejercicio.
 *
 * Solo se avanza si el ejercicio afectado era el actual y ya no tiene series
 * pendientes; si se registró una serie de otro ejercicio, no se roba el foco.
 */
function advanceIfNeeded(
  previous: WorkoutEngineState,
  exercises: SessionExerciseWithSets[],
  changedExerciseId: string,
): WorkoutEngineState {
  const changed = exercises.find((exercise) => exercise.id === changedExerciseId);
  const wasCurrent = previous.currentExerciseId === changedExerciseId;

  let currentExerciseId = previous.currentExerciseId;
  if (wasCurrent && changed && changed.status === 'completado') {
    currentExerciseId = pickNextExercise(exercises)?.id ?? null;
  } else if (currentExerciseId == null) {
    currentExerciseId = pickNextExercise(exercises)?.id ?? null;
  }

  return { ...previous, exercises, currentExerciseId };
}
