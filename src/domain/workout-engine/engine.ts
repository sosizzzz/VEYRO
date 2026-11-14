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
    case 'REST_TIMER_STARTED':
      return startRestTimer(state, event);
    case 'REST_TIMER_PAUSED':
      return pauseRestTimer(state, event.at);
    case 'REST_TIMER_RESUMED':
      return resumeRestTimer(state, event.at);
    case 'REST_TIMER_STOPPED':
      return stopRestTimer(state);
    case 'REST_TIMER_TICKED':
      return tickRestTimer(state, event.now);
    case 'REST_TIMER_DURATION_CHANGED':
      return changeRestTimerDuration(state, event.seconds);
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

/** Límites del descanso, en segundos. Coinciden con el CHECK de la migración 006. */
const MIN_REST_SECONDS = 1;
const MAX_REST_SECONDS = 3600;

/** Convierte una fecha ISO en milisegundos; `null` si no es válida. */
function parseTimestamp(value: string): number | null {
  const milliseconds = Date.parse(value);
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

/** Segundos que faltan entre dos fechas ISO, redondeando hacia arriba. */
function secondsBetween(from: string, to: string): number | null {
  const start = parseTimestamp(from);
  const end = parseTimestamp(to);
  if (start === null || end === null) return null;
  return Math.max(0, Math.ceil((end - start) / 1000));
}

/** ¿El descanso pedido está dentro de los límites? */
function isValidRestSeconds(seconds: number): boolean {
  return Number.isInteger(seconds) && seconds >= MIN_REST_SECONDS && seconds <= MAX_REST_SECONDS;
}

/**
 * Segundos que le quedan al descanso en un momento dado, para pintarlos.
 *
 * No modifica el estado: la pantalla puede llamarlo cada segundo y, cuando
 * llegue a 0, enviar `REST_TIMER_TICKED` para que el motor lo detenga.
 */
export function getRestTimerRemaining(state: WorkoutEngineState, now: string): number {
  const { rest_timer_state, rest_timer_remaining, rest_timer_ends_at } = state.session;
  if (rest_timer_state !== 'corriendo' || !rest_timer_ends_at) {
    return rest_timer_remaining;
  }
  return secondsBetween(now, rest_timer_ends_at) ?? rest_timer_remaining;
}

function startRestTimer(
  state: WorkoutEngineState,
  event: Extract<WorkoutEvent, { type: 'REST_TIMER_STARTED' }>,
): WorkoutEngineResult {
  const startedAt = parseTimestamp(event.startedAt);
  if (startedAt === null) return fail('INVALID_TIMESTAMP');

  const seconds = event.seconds ?? state.session.rest_timer_seconds;
  if (!isValidRestSeconds(seconds)) return fail('INVALID_TIMER_SECONDS');

  // Guardamos la hora exacta de fin: si la app se cierra mientras corre, al
  // volver se recalcula comparando esa hora con la actual (WORKFLOW.md §6).
  const endsAt = new Date(startedAt + seconds * 1000).toISOString();

  return ok({
    ...state,
    session: {
      ...state.session,
      rest_timer_seconds: seconds,
      rest_timer_state: 'corriendo',
      rest_timer_remaining: seconds,
      rest_timer_ends_at: endsAt,
    },
  });
}

function pauseRestTimer(state: WorkoutEngineState, at: string): WorkoutEngineResult {
  if (state.session.rest_timer_state !== 'corriendo' || !state.session.rest_timer_ends_at) {
    return fail('REST_TIMER_NOT_RUNNING');
  }

  const remaining = secondsBetween(at, state.session.rest_timer_ends_at);
  if (remaining === null) return fail('INVALID_TIMESTAMP');

  // Si al pausar ya había terminado, se detiene en vez de quedarse en 0.
  if (remaining === 0) {
    return ok({
      ...state,
      session: {
        ...state.session,
        rest_timer_state: 'detenido',
        rest_timer_remaining: 0,
        rest_timer_ends_at: null,
      },
    });
  }

  return ok({
    ...state,
    session: {
      ...state.session,
      rest_timer_state: 'pausado',
      rest_timer_remaining: remaining,
      rest_timer_ends_at: null,
    },
  });
}

function resumeRestTimer(state: WorkoutEngineState, at: string): WorkoutEngineResult {
  if (state.session.rest_timer_state !== 'pausado') {
    return fail('REST_TIMER_NOT_PAUSED');
  }

  const resumedAt = parseTimestamp(at);
  if (resumedAt === null) return fail('INVALID_TIMESTAMP');

  const remaining = state.session.rest_timer_remaining;
  if (remaining <= 0) {
    return ok({
      ...state,
      session: {
        ...state.session,
        rest_timer_state: 'detenido',
        rest_timer_remaining: 0,
        rest_timer_ends_at: null,
      },
    });
  }

  const endsAt = new Date(resumedAt + remaining * 1000).toISOString();
  return ok({
    ...state,
    session: {
      ...state.session,
      rest_timer_state: 'corriendo',
      rest_timer_ends_at: endsAt,
    },
  });
}

function stopRestTimer(state: WorkoutEngineState): WorkoutEngineResult {
  return ok({
    ...state,
    session: {
      ...state.session,
      rest_timer_state: 'detenido',
      // Al detener, el temporizador vuelve a mostrar el descanso configurado.
      rest_timer_remaining: state.session.rest_timer_seconds,
      rest_timer_ends_at: null,
    },
  });
}

function tickRestTimer(state: WorkoutEngineState, now: string): WorkoutEngineResult {
  // Un tick con el temporizador parado no es un error: la pantalla puede
  // seguir enviándolos sin comprobar antes el estado.
  if (state.session.rest_timer_state !== 'corriendo' || !state.session.rest_timer_ends_at) {
    return ok(state);
  }

  const remaining = secondsBetween(now, state.session.rest_timer_ends_at);
  if (remaining === null) return fail('INVALID_TIMESTAMP');

  if (remaining === 0) {
    return ok({
      ...state,
      session: {
        ...state.session,
        rest_timer_state: 'detenido',
        rest_timer_remaining: 0,
        rest_timer_ends_at: null,
      },
    });
  }

  return ok({
    ...state,
    session: { ...state.session, rest_timer_remaining: remaining },
  });
}

function changeRestTimerDuration(state: WorkoutEngineState, seconds: number): WorkoutEngineResult {
  if (!isValidRestSeconds(seconds)) return fail('INVALID_TIMER_SECONDS');

  return ok({
    ...state,
    session: {
      ...state.session,
      rest_timer_seconds: seconds,
      // Si no hay cuenta atrás en marcha, el número mostrado se actualiza.
      rest_timer_remaining:
        state.session.rest_timer_state === 'detenido'
          ? seconds
          : state.session.rest_timer_remaining,
    },
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
