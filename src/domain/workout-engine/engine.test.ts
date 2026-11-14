/**
 * Tests del motor de sesión (Fase 5).
 *
 * Se prueba la lógica pura, sin pantallas ni Supabase. Cubren los casos que
 * describe WORKFLOW.md: orden, saltar, omitir, completar, finalizar y cancelar.
 */
import type {
  SessionExerciseWithSets,
  SessionParticipant,
  SessionSet,
  WorkoutSession,
  WorkoutSessionDetail,
} from '../../types/workout';

import {
  applyWorkoutEvent,
  canFinish,
  createWorkoutEngineState,
  getNextExercise,
  getRestTimerRemaining,
} from './engine';
import type { WorkoutEngineState } from './types';

/** Crea una serie pendiente con objetivos sencillos. */
function makeSet(exerciseId: string, number: number, targetWeight: number | null = null): SessionSet {
  return {
    id: `${exerciseId}-set-${number}`,
    session_exercise_id: exerciseId,
    participant_id: 'participant-1',
    set_number: number,
    target_weight: targetWeight,
    target_reps: 10,
    target_time_seconds: null,
    actual_weight: null,
    actual_reps: null,
    actual_time_seconds: null,
    status: 'pendiente',
    completed_at: null,
    client_operation_id: `${exerciseId}-op-${number}`,
  };
}

/** Crea un ejercicio pendiente con el número de series indicado. */
function makeExercise(
  id: string,
  position: number,
  setCount = 2,
  weight: number | null = null,
): SessionExerciseWithSets {
  return {
    id,
    session_id: 'session-1',
    exercise_id: `original-${id}`,
    exercise_name: `Ejercicio ${position}`,
    primary_muscles: ['Pecho'],
    icon: null,
    position,
    status: 'pendiente',
    sets: Array.from({ length: setCount }, (_, index) => makeSet(id, index + 1, weight)),
  };
}

const SESSION: WorkoutSession = {
  id: 'session-1',
  owner_id: 'user-1',
  routine_id: 'routine-1',
  mode: 'individual',
  status: 'en_curso',
  started_at: '2026-11-14T18:00:00.000Z',
  finished_at: null,
  current_participant_id: 'participant-1',
  rest_timer_seconds: 60,
  rest_timer_state: 'detenido',
  rest_timer_remaining: 60,
  rest_timer_ends_at: null,
};

const PARTICIPANT: SessionParticipant = {
  id: 'participant-1',
  session_id: 'session-1',
  user_id: 'user-1',
  position: 1,
};

/** Monta un detalle de sesión con los ejercicios indicados. */
function makeDetail(exercises: SessionExerciseWithSets[]): WorkoutSessionDetail {
  return { ...SESSION, participants: [PARTICIPANT], exercises };
}

/** Estado con tres ejercicios en orden 1, 2 y 3. */
function makeThreeExerciseState(): WorkoutEngineState {
  return createWorkoutEngineState(
    makeDetail([
      makeExercise('third', 3),
      makeExercise('first', 1),
      makeExercise('second', 2),
    ]),
  );
}

/** Completa todas las series pendientes de un ejercicio y devuelve el estado. */
function completeExercise(state: WorkoutEngineState, exerciseId: string): WorkoutEngineState {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) throw new Error(`No existe el ejercicio ${exerciseId}`);

  let current = state;
  for (const set of exercise.sets.filter((item) => item.status === 'pendiente')) {
    const result = applyWorkoutEvent(current, {
      type: 'SET_COMPLETED',
      exerciseId,
      setId: set.id,
      actualWeight: set.target_weight,
      actualReps: 10,
      completedAt: '2026-11-14T18:10:00.000Z',
    });
    if (!result.ok) throw new Error(`Fallo inesperado: ${result.error}`);
    current = result.state;
  }
  return current;
}

describe('createWorkoutEngineState', () => {
  it('elige el primer ejercicio por posición, aunque el array venga desordenado', () => {
    const state = makeThreeExerciseState();
    expect(state.currentExerciseId).toBe('first');
  });

  it('no modifica el detalle original', () => {
    const detail = makeDetail([makeExercise('first', 1)]);
    const state = createWorkoutEngineState(detail);
    state.exercises[0].status = 'omitido';

    expect(detail.exercises[0].status).toBe('pendiente');
  });
});

describe('completar series', () => {
  it('marca la serie como completada con los valores reales', () => {
    const state = createWorkoutEngineState(makeDetail([makeExercise('first', 1, 1, 60)]));

    const result = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId: 'first',
      setId: 'first-set-1',
      actualWeight: 62.5,
      actualReps: 8,
      completedAt: '2026-11-14T18:05:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const set = result.state.exercises[0].sets[0];
    expect(set.status).toBe('completada');
    expect(set.actual_weight).toBe(62.5);
    expect(set.actual_reps).toBe(8);
    expect(set.completed_at).toBe('2026-11-14T18:05:00.000Z');
  });

  it('no guarda métricas que no tenían objetivo', () => {
    const state = createWorkoutEngineState(makeDetail([makeExercise('first', 1, 1)]));

    const result = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId: 'first',
      setId: 'first-set-1',
      actualWeight: 99,
      actualReps: 12,
      actualTimeSeconds: 30,
      completedAt: '2026-11-14T18:05:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const set = result.state.exercises[0].sets[0];
    // El objetivo solo pedía repeticiones; peso y tiempo se descartan.
    expect(set.actual_weight).toBeNull();
    expect(set.actual_reps).toBe(12);
    expect(set.actual_time_seconds).toBeNull();
  });

  it('al completar todas las series, el ejercicio pasa a completado y avanza al siguiente', () => {
    let state = makeThreeExerciseState();
    state = completeExercise(state, 'first');

    expect(state.exercises.find((item) => item.id === 'first')?.status).toBe('completado');
    expect(state.currentExerciseId).toBe('second');
  });

  it('completar una serie de otro ejercicio no cambia el ejercicio actual', () => {
    const state = makeThreeExerciseState();

    const result = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId: 'third',
      setId: 'third-set-1',
      actualReps: 10,
      completedAt: '2026-11-14T18:05:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentExerciseId).toBe('first');
  });

  it('rechaza una serie que ya estaba registrada', () => {
    const state = createWorkoutEngineState(makeDetail([makeExercise('first', 1, 2)]));

    const first = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId: 'first',
      setId: 'first-set-1',
      actualReps: 10,
      completedAt: '2026-11-14T18:05:00.000Z',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // El ejercicio aún tiene la serie 2 pendiente, así que el error es de la
    // serie repetida, no del ejercicio.
    const result = applyWorkoutEvent(first.state, {
      type: 'SET_COMPLETED',
      exerciseId: 'first',
      setId: 'first-set-1',
      actualReps: 10,
      completedAt: '2026-11-14T18:20:00.000Z',
    });

    expect(result).toEqual({ ok: false, error: 'SET_NOT_PENDING' });
  });
});

describe('saltar frente a omitir', () => {
  it('saltar el primero propone el segundo y lo saltado vuelve después', () => {
    let state = makeThreeExerciseState();

    const skip = applyWorkoutEvent(state, { type: 'EXERCISE_SKIPPED', exerciseId: 'first' });
    expect(skip.ok).toBe(true);
    if (!skip.ok) return;
    state = skip.state;

    expect(state.exercises.find((item) => item.id === 'first')?.status).toBe('saltado');
    expect(state.currentExerciseId).toBe('second');

    // Al terminar el segundo, vuelve el primero (sigue pendiente en la cola).
    state = completeExercise(state, 'second');
    expect(state.currentExerciseId).toBe('first');

    // Al terminar el primero, propone el tercero.
    state = completeExercise(state, 'first');
    expect(state.currentExerciseId).toBe('third');
  });

  it('omitir saca el ejercicio de la cola definitivamente', () => {
    let state = makeThreeExerciseState();

    const omit = applyWorkoutEvent(state, { type: 'EXERCISE_OMITTED', exerciseId: 'first' });
    expect(omit.ok).toBe(true);
    if (!omit.ok) return;
    state = omit.state;

    expect(state.exercises.find((item) => item.id === 'first')?.status).toBe('omitido');
    expect(state.currentExerciseId).toBe('second');

    state = completeExercise(state, 'second');
    // El omitido no vuelve; pasa al tercero.
    expect(state.currentExerciseId).toBe('third');
  });

  it('al omitir una serie, si era la última, el ejercicio queda completado', () => {
    const state = createWorkoutEngineState(makeDetail([makeExercise('first', 1, 1)]));

    const result = applyWorkoutEvent(state, {
      type: 'SET_OMITTED',
      exerciseId: 'first',
      setId: 'first-set-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.exercises[0].sets[0].status).toBe('omitida');
    expect(result.state.exercises[0].status).toBe('completado');
    expect(result.state.currentExerciseId).toBeNull();
  });

  it('no se puede seleccionar un ejercicio completado u omitido', () => {
    let state = makeThreeExerciseState();
    state = completeExercise(state, 'first');

    const result = applyWorkoutEvent(state, {
      type: 'EXERCISE_SELECTED',
      exerciseId: 'first',
    });

    expect(result).toEqual({ ok: false, error: 'EXERCISE_NOT_AVAILABLE' });
  });
});

describe('finalizar y cancelar', () => {
  it('no permite finalizar con ejercicios pendientes', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'SESSION_FINISHED',
      finishedAt: '2026-11-14T19:00:00.000Z',
    });

    expect(result).toEqual({ ok: false, error: 'PENDING_EXERCISES' });
    expect(canFinish(state)).toBe(false);
  });

  it('finaliza cuando todos están completados u omitidos', () => {
    let state = makeThreeExerciseState();
    state = completeExercise(state, 'first');
    state = completeExercise(state, 'second');
    state = completeExercise(state, 'third');

    expect(canFinish(state)).toBe(true);

    const result = applyWorkoutEvent(state, {
      type: 'SESSION_FINISHED',
      finishedAt: '2026-11-14T19:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.session.status).toBe('finalizada');
    expect(result.state.session.finished_at).toBe('2026-11-14T19:00:00.000Z');
    expect(result.state.currentExerciseId).toBeNull();
  });

  it('cancelar no exige terminar los ejercicios', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, { type: 'SESSION_CANCELED' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.session.status).toBe('cancelada');
  });

  it('una sesión finalizada ya no admite más acciones', () => {
    let state = createWorkoutEngineState(makeDetail([makeExercise('first', 1, 1)]));
    state = completeExercise(state, 'first');

    const finished = applyWorkoutEvent(state, {
      type: 'SESSION_FINISHED',
      finishedAt: '2026-11-14T19:00:00.000Z',
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;

    const later = applyWorkoutEvent(finished.state, { type: 'SESSION_CANCELED' });
    expect(later).toEqual({ ok: false, error: 'SESSION_NOT_IN_PROGRESS' });
  });
});

describe('errores de identificadores', () => {
  it('avisa si el ejercicio no existe', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'EXERCISE_SKIPPED',
      exerciseId: 'no-existe',
    });

    expect(result).toEqual({ ok: false, error: 'EXERCISE_NOT_FOUND' });
  });

  it('avisa si la serie no existe', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId: 'first',
      setId: 'no-existe',
      completedAt: '2026-11-14T18:05:00.000Z',
    });

    expect(result).toEqual({ ok: false, error: 'SET_NOT_FOUND' });
  });
});

describe('getNextExercise', () => {
  it('mantiene el ejercicio actual si todavía tiene series pendientes', () => {
    const state = makeThreeExerciseState();
    expect(getNextExercise(state)?.id).toBe('first');
  });
});

describe('temporizador de descanso', () => {
  it('arranca con el descanso configurado y guarda la hora de fin', () => {
    const state = makeThreeExerciseState();

    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.session.rest_timer_state).toBe('corriendo');
    expect(result.state.session.rest_timer_remaining).toBe(60);
    expect(result.state.session.rest_timer_ends_at).toBe('2026-11-14T18:01:00.000Z');
  });

  it('permite arrancar con otra duración y la recuerda', () => {
    const state = makeThreeExerciseState();

    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
      seconds: 90,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.session.rest_timer_seconds).toBe(90);
    expect(result.state.session.rest_timer_ends_at).toBe('2026-11-14T18:01:30.000Z');
  });

  it('rechaza duraciones fuera de rango', () => {
    const state = makeThreeExerciseState();

    for (const seconds of [0, -5, 3601, 1.5]) {
      const result = applyWorkoutEvent(state, {
        type: 'REST_TIMER_STARTED',
        startedAt: '2026-11-14T18:00:00.000Z',
        seconds,
      });
      expect(result).toEqual({ ok: false, error: 'INVALID_TIMER_SECONDS' });
    }
  });

  it('rechaza una fecha de inicio inválida', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_STARTED',
      startedAt: 'no-es-una-fecha',
    });

    expect(result).toEqual({ ok: false, error: 'INVALID_TIMESTAMP' });
  });

  it('al pausar conserva los segundos restantes', () => {
    const started = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });
    if (!started.ok) throw new Error('No arrancó');

    const paused = applyWorkoutEvent(started.state, {
      type: 'REST_TIMER_PAUSED',
      at: '2026-11-14T18:00:20.000Z',
    });

    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    expect(paused.state.session.rest_timer_state).toBe('pausado');
    expect(paused.state.session.rest_timer_remaining).toBe(40);
    expect(paused.state.session.rest_timer_ends_at).toBeNull();
  });

  it('no se puede pausar un descanso detenido', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_PAUSED',
      at: '2026-11-14T18:00:20.000Z',
    });

    expect(result).toEqual({ ok: false, error: 'REST_TIMER_NOT_RUNNING' });
  });

  it('al reanudar recalcula la hora de fin desde el momento actual', () => {
    const started = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });
    if (!started.ok) throw new Error('No arrancó');

    const paused = applyWorkoutEvent(started.state, {
      type: 'REST_TIMER_PAUSED',
      at: '2026-11-14T18:00:20.000Z',
    });
    if (!paused.ok) throw new Error('No pausó');

    const resumed = applyWorkoutEvent(paused.state, {
      type: 'REST_TIMER_RESUMED',
      at: '2026-11-14T18:05:00.000Z',
    });

    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.state.session.rest_timer_state).toBe('corriendo');
    // Quedaban 40 s: el descanso termina a las 18:05:40.
    expect(resumed.state.session.rest_timer_ends_at).toBe('2026-11-14T18:05:40.000Z');
  });

  it('no se puede reanudar un descanso que no está pausado', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_RESUMED',
      at: '2026-11-14T18:05:00.000Z',
    });

    expect(result).toEqual({ ok: false, error: 'REST_TIMER_NOT_PAUSED' });
  });

  it('el tick actualiza los segundos y detiene al llegar a cero', () => {
    const started = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });
    if (!started.ok) throw new Error('No arrancó');

    const mid = applyWorkoutEvent(started.state, {
      type: 'REST_TIMER_TICKED',
      now: '2026-11-14T18:00:30.000Z',
    });
    expect(mid.ok).toBe(true);
    if (!mid.ok) return;
    expect(mid.state.session.rest_timer_remaining).toBe(30);
    expect(mid.state.session.rest_timer_state).toBe('corriendo');

    // Simula el móvil apagado: han pasado 10 minutos, no 30 segundos.
    const late = applyWorkoutEvent(mid.state, {
      type: 'REST_TIMER_TICKED',
      now: '2026-11-14T18:10:00.000Z',
    });
    expect(late.ok).toBe(true);
    if (!late.ok) return;
    expect(late.state.session.rest_timer_state).toBe('detenido');
    expect(late.state.session.rest_timer_remaining).toBe(0);
    expect(late.state.session.rest_timer_ends_at).toBeNull();
  });

  it('un tick con el descanso parado no cambia nada ni da error', () => {
    const state = makeThreeExerciseState();
    const result = applyWorkoutEvent(state, {
      type: 'REST_TIMER_TICKED',
      now: '2026-11-14T18:00:30.000Z',
    });

    expect(result).toEqual({ ok: true, state });
  });

  it('detener devuelve el tiempo configurado', () => {
    const started = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
      seconds: 45,
    });
    if (!started.ok) throw new Error('No arrancó');

    const stopped = applyWorkoutEvent(started.state, { type: 'REST_TIMER_STOPPED' });

    expect(stopped.ok).toBe(true);
    if (!stopped.ok) return;
    expect(stopped.state.session.rest_timer_state).toBe('detenido');
    expect(stopped.state.session.rest_timer_remaining).toBe(45);
    expect(stopped.state.session.rest_timer_ends_at).toBeNull();
  });

  it('cambiar la duración actualiza lo mostrado solo si está detenido', () => {
    const stopped = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_DURATION_CHANGED',
      seconds: 120,
    });
    expect(stopped.ok).toBe(true);
    if (!stopped.ok) return;
    expect(stopped.state.session.rest_timer_seconds).toBe(120);
    expect(stopped.state.session.rest_timer_remaining).toBe(120);

    const started = applyWorkoutEvent(stopped.state, {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });
    if (!started.ok) throw new Error('No arrancó');

    const changed = applyWorkoutEvent(started.state, {
      type: 'REST_TIMER_DURATION_CHANGED',
      seconds: 30,
    });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(changed.state.session.rest_timer_seconds).toBe(30);
    // La cuenta atrás en marcha no se reinicia de golpe.
    expect(changed.state.session.rest_timer_remaining).toBe(120);
  });

  it('getRestTimerRemaining calcula el tiempo con la hora actual', () => {
    const started = applyWorkoutEvent(makeThreeExerciseState(), {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:00:00.000Z',
    });
    if (!started.ok) throw new Error('No arrancó');

    expect(getRestTimerRemaining(started.state, '2026-11-14T18:00:15.000Z')).toBe(45);
    expect(getRestTimerRemaining(started.state, '2026-11-14T18:02:00.000Z')).toBe(0);
  });
});
