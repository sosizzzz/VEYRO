/**
 * Servicios de sesiones de entrenamiento (tarea A-04).
 *
 * ¿Qué hace este archivo?
 * - Inicia una sesión a partir de una rutina y guarda una "foto" de ella:
 *   nombre, músculos, icono y objetivos de cada serie se copian a las tablas
 *   de sesión. Así el historial no cambia aunque luego edites la rutina.
 * - Lee una sesión completa (participantes, ejercicios y series).
 * - Busca la sesión que está en curso para poder reanudarla.
 * - Guarda resultados de series y estados de ejercicios.
 * - Finaliza o cancela la sesión.
 *
 * Las pantallas NO llaman a Supabase directamente: llaman a estas funciones.
 * RLS (seguridad por fila) comprueba en el servidor que la sesión es tuya.
 */
import { randomUUID } from 'expo-crypto';

import { supabase } from '@/data/supabase/client';
import type {
  SessionExercise,
  SessionExerciseWithSets,
  SessionParticipant,
  SessionSet,
  WorkoutSession,
  WorkoutSessionDetail,
} from '@/types/workout';
import { DEFAULT_REST_TIMER_SECONDS } from '@/types/workout';

/** Columnas de la fila madre de la sesión. */
const SESSION_COLUMNS =
  'id, owner_id, routine_id, mode, status, started_at, finished_at, ' +
  'current_participant_id, rest_timer_seconds, rest_timer_state, ' +
  'rest_timer_remaining, rest_timer_ends_at';

/** Límites del descanso; coinciden con el CHECK de la migración 006. */
const MIN_REST_SECONDS = 1;
const MAX_REST_SECONDS = 3600;

/** Opciones al iniciar una sesión. */
export type StartSessionOptions = {
  /** Fecha de inicio en ISO 8601. Se puede fijar en tests. */
  startedAt?: string;
  /** Descanso en segundos. Por defecto, 60. */
  restTimerSeconds?: number;
};

/** Fila de rutina que necesitamos para validar el inicio. */
type RoutineRow = {
  id: string;
  owner_id: string;
  archived_at: string | null;
};

/** Ejercicio de la rutina con los datos del catálogo que se copiarán. */
type RoutineExerciseRow = {
  id: string;
  exercise_id: string;
  position: number;
  exercises: {
    name: string;
    primary_muscles: string[];
    icon: string | null;
  } | null;
};

/** Objetivo de una serie en la rutina. */
type RoutineSetTargetRow = {
  routine_exercise_id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  target_time_seconds: number | null;
};

/** Comprueba que el descanso está dentro de los límites de la base de datos. */
function normalizeRestSeconds(seconds: number | undefined): number {
  const value = seconds ?? DEFAULT_REST_TIMER_SECONDS;
  if (!Number.isInteger(value) || value < MIN_REST_SECONDS || value > MAX_REST_SECONDS) {
    throw new Error('El descanso debe durar entre 1 y 3600 segundos.');
  }
  return value;
}

/**
 * Inicia un entrenamiento copiando una rutina completa.
 *
 * Ejemplo:
 * ```ts
 * const detalle = await startSessionFromRoutine(usuario.id, rutinaId);
 * // detalle.exercises ya trae los objetivos de la rutina y todas las series
 * // en estado "pendiente", listas para el motor de sesión.
 * ```
 *
 * Si algo falla a mitad, la sesión se marca como `cancelada` para que no
 * aparezca como un entrenamiento en curso roto. No se borra porque la
 * migración 006 no permite DELETE: el historial nunca se destruye.
 */
export async function startSessionFromRoutine(
  ownerId: string,
  routineId: string,
  options: StartSessionOptions = {},
): Promise<WorkoutSessionDetail> {
  const restSeconds = normalizeRestSeconds(options.restTimerSeconds);
  const startedAt = options.startedAt ?? new Date().toISOString();

  // 1) Leer la rutina. RLS ya impide ver rutinas de otras personas; aun así
  //    comprobamos el dueño para dar un mensaje claro.
  const { data: routineData, error: routineError } = await supabase
    .from('routines')
    .select('id, owner_id, archived_at')
    .eq('id', routineId)
    .maybeSingle();

  if (routineError) throw routineError;

  const routine = routineData as RoutineRow | null;
  if (!routine || routine.owner_id !== ownerId) {
    throw new Error('La rutina no existe o no es tuya.');
  }
  if (routine.archived_at) {
    throw new Error('No puedes iniciar una rutina archivada. Recupérala primero.');
  }

  // 2) Leer los ejercicios y sus objetivos. `exercises(...)` pide los datos
  //    del catálogo en la misma consulta (PostgREST lo llama "relación
  //    embebida").
  const { data: exerciseData, error: exerciseError } = await supabase
    .from('routine_exercises')
    .select('id, exercise_id, position, exercises(name, primary_muscles, icon)')
    .eq('routine_id', routineId)
    .order('position', { ascending: true });

  if (exerciseError) throw exerciseError;

  const routineExercises = (exerciseData as unknown as RoutineExerciseRow[] | null) ?? [];
  if (routineExercises.length === 0) {
    throw new Error('La rutina no tiene ejercicios. Añade al menos uno antes de empezar.');
  }

  const routineExerciseIds = routineExercises.map((item) => item.id);
  const { data: targetData, error: targetError } = await supabase
    .from('routine_set_targets')
    .select('routine_exercise_id, set_number, target_weight, target_reps, target_time_seconds')
    .in('routine_exercise_id', routineExerciseIds)
    .order('set_number', { ascending: true });

  if (targetError) throw targetError;

  const targetsByRoutineExercise = new Map<string, RoutineSetTargetRow[]>();
  for (const target of (targetData as RoutineSetTargetRow[] | null) ?? []) {
    const list = targetsByRoutineExercise.get(target.routine_exercise_id) ?? [];
    list.push(target);
    targetsByRoutineExercise.set(target.routine_exercise_id, list);
  }

  // 3) Crear la fila madre de la sesión.
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      owner_id: ownerId,
      routine_id: routineId,
      mode: 'individual',
      status: 'en_curso',
      started_at: startedAt,
      rest_timer_seconds: restSeconds,
      rest_timer_state: 'detenido',
      rest_timer_remaining: restSeconds,
      rest_timer_ends_at: null,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (sessionError) throw sessionError;
  const session = sessionData as unknown as WorkoutSession;

  try {
    // 4) Crear el participante. En el MVP siempre hay una sola persona.
    const { data: participantData, error: participantError } = await supabase
      .from('session_participants')
      .insert({ session_id: session.id, user_id: ownerId, position: 1 })
      .select('id, session_id, user_id, position')
      .single();

    if (participantError) throw participantError;
    const participant = participantData as SessionParticipant;

    // 5) Guardar qué participante tiene el turno.
    const { error: turnError } = await supabase
      .from('workout_sessions')
      .update({ current_participant_id: participant.id })
      .eq('id', session.id);

    if (turnError) throw turnError;

    // 6) Copiar cada ejercicio y sus series (la "foto").
    const exercises: SessionExerciseWithSets[] = [];

    for (const routineExercise of routineExercises) {
      if (!routineExercise.exercises) {
        throw new Error('La rutina contiene un ejercicio que ya no existe.');
      }

      const { data: copiedExerciseData, error: copiedExerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: session.id,
          exercise_id: routineExercise.exercise_id,
          exercise_name: routineExercise.exercises.name,
          primary_muscles: routineExercise.exercises.primary_muscles,
          icon: routineExercise.exercises.icon,
          position: routineExercise.position,
          status: 'pendiente',
        })
        .select(
          'id, session_id, exercise_id, exercise_name, primary_muscles, icon, position, status',
        )
        .single();

      if (copiedExerciseError) throw copiedExerciseError;
      const copiedExercise = copiedExerciseData as SessionExercise;

      // Si por datos antiguos no hay objetivos, se crea una serie vacía para
      // que el ejercicio tenga algo que registrar y no se dé por completado.
      const routineTargets = targetsByRoutineExercise.get(routineExercise.id) ?? [];
      const setPayloads =
        routineTargets.length > 0
          ? routineTargets.map((target) => ({
              session_exercise_id: copiedExercise.id,
              participant_id: participant.id,
              set_number: target.set_number,
              target_weight: target.target_weight,
              target_reps: target.target_reps,
              target_time_seconds: target.target_time_seconds,
              status: 'pendiente',
              client_operation_id: randomUUID(),
            }))
          : [
              {
                session_exercise_id: copiedExercise.id,
                participant_id: participant.id,
                set_number: 1,
                target_weight: null,
                target_reps: null,
                target_time_seconds: null,
                status: 'pendiente',
                client_operation_id: randomUUID(),
              },
            ];

      const { data: copiedSetsData, error: copiedSetsError } = await supabase
        .from('session_sets')
        .insert(setPayloads)
        .select(
          'id, session_exercise_id, participant_id, set_number, target_weight, target_reps, ' +
            'target_time_seconds, actual_weight, actual_reps, actual_time_seconds, status, ' +
            'completed_at, client_operation_id',
        );

      if (copiedSetsError) throw copiedSetsError;

      const copiedSets = ((copiedSetsData as unknown as SessionSet[] | null) ?? []).sort(
        (a, b) => a.set_number - b.set_number,
      );

      exercises.push({
        ...copiedExercise,
        sets: copiedSets,
      });
    }

    return {
      ...session,
      current_participant_id: participant.id,
      participants: [participant],
      exercises,
    };
  } catch (error) {
    // La sesión ya existe; si no se puede completar, se cancela para que no
    // quede como "en curso". No se puede borrar (política de la 006).
    // Si esta limpieza también falla (por ejemplo, sin red), no tapamos el
    // error original: es el que explica qué pasó.
    try {
      await supabase
        .from('workout_sessions')
        .update({
          status: 'cancelada',
          current_participant_id: null,
          rest_timer_state: 'detenido',
          rest_timer_remaining: 0,
          rest_timer_ends_at: null,
        })
        .eq('id', session.id);
    } catch {
      // Nada que hacer: se informa del error original.
    }

    throw error;
  }
}

/** Lee una sesión completa con participantes, ejercicios y series. */
export async function getWorkoutSessionDetail(
  sessionId: string,
): Promise<WorkoutSessionDetail | null> {
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!sessionData) return null;

  const session = sessionData as unknown as WorkoutSession;

  const [{ data: participantData, error: participantError }, { data: exerciseData, error: exerciseError }] =
    await Promise.all([
      supabase
        .from('session_participants')
        .select('id, session_id, user_id, position')
        .eq('session_id', sessionId)
        .order('position', { ascending: true }),
      supabase
        .from('session_exercises')
        .select('id, session_id, exercise_id, exercise_name, primary_muscles, icon, position, status')
        .eq('session_id', sessionId)
        .order('position', { ascending: true }),
    ]);

  if (participantError) throw participantError;
  if (exerciseError) throw exerciseError;

  const participants = (participantData as SessionParticipant[] | null) ?? [];
  const exercises = (exerciseData as SessionExercise[] | null) ?? [];

  let sets: SessionSet[] = [];
  if (exercises.length > 0) {
    const { data: setData, error: setError } = await supabase
      .from('session_sets')
      .select(
        'id, session_exercise_id, participant_id, set_number, target_weight, target_reps, ' +
          'target_time_seconds, actual_weight, actual_reps, actual_time_seconds, status, ' +
          'completed_at, client_operation_id',
      )
      .in(
        'session_exercise_id',
        exercises.map((exercise) => exercise.id),
      )
      .order('set_number', { ascending: true });

    if (setError) throw setError;
    sets = (setData as unknown as SessionSet[] | null) ?? [];
  }

  // Agrupar las series por ejercicio para que la pantalla las reciba juntas.
  const setsByExercise = new Map<string, SessionSet[]>();
  for (const set of sets) {
    const list = setsByExercise.get(set.session_exercise_id) ?? [];
    list.push(set);
    setsByExercise.set(set.session_exercise_id, list);
  }

  return {
    ...session,
    participants,
    exercises: exercises.map((exercise) => ({
      ...exercise,
      sets: setsByExercise.get(exercise.id) ?? [],
    })),
  };
}

/**
 * Busca la sesión en curso del usuario (la más reciente).
 *
 * Sirve para reanudar un entrenamiento que se quedó abierto al cerrar la app.
 * Devuelve `null` si no hay ninguna.
 */
export async function getActiveWorkoutSession(
  ownerId: string,
): Promise<WorkoutSessionDetail | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('status', 'en_curso')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return getWorkoutSessionDetail((data as { id: string }).id);
}

/**
 * Guarda los campos mutables de la sesión (estado, fin y temporizador).
 *
 * Se usa después de cada evento del motor. No guarda ejercicios ni series:
 * para eso están `saveSessionExerciseStatus` y `saveSessionSetResult`.
 */
export async function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({
      status: session.status,
      finished_at: session.finished_at,
      current_participant_id: session.current_participant_id,
      rest_timer_seconds: session.rest_timer_seconds,
      rest_timer_state: session.rest_timer_state,
      rest_timer_remaining: session.rest_timer_remaining,
      rest_timer_ends_at: session.rest_timer_ends_at,
    })
    .eq('id', session.id);

  if (error) throw error;
}

/** Guarda el estado de un ejercicio (pendiente, saltado, omitido o completado). */
export async function saveSessionExerciseStatus(
  sessionExerciseId: string,
  status: SessionExercise['status'],
): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .update({ status })
    .eq('id', sessionExerciseId);

  if (error) throw error;
}

/**
 * Guarda el resultado real de una serie.
 *
 * `client_operation_id` no se modifica: identifica la operación original y
 * evita que un reintento cree una serie duplicada.
 */
export async function saveSessionSetResult(set: SessionSet): Promise<void> {
  const { error } = await supabase
    .from('session_sets')
    .update({
      status: set.status,
      actual_weight: set.actual_weight,
      actual_reps: set.actual_reps,
      actual_time_seconds: set.actual_time_seconds,
      completed_at: set.completed_at,
    })
    .eq('id', set.id);

  if (error) throw error;
}

/**
 * Finaliza una sesión. Antes comprueba que no queden ejercicios pendientes ni
 * saltados, igual que el motor; así una llamada suelta no deja datos a medias.
 */
export async function finishWorkoutSession(
  sessionId: string,
  finishedAt: string,
): Promise<void> {
  const { data: pending, error: pendingError } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('session_id', sessionId)
    .in('status', ['pendiente', 'saltado'])
    .limit(1);

  if (pendingError) throw pendingError;
  if (pending && pending.length > 0) {
    throw new Error('Todavía quedan ejercicios pendientes.');
  }

  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'finalizada',
      finished_at: finishedAt,
      current_participant_id: null,
      rest_timer_state: 'detenido',
      rest_timer_remaining: 0,
      rest_timer_ends_at: null,
    })
    .eq('id', sessionId)
    .eq('status', 'en_curso')
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('La sesión ya no está en curso.');
  }
}

/**
 * Cancela una sesión. No cuenta como entrenamiento y conserva las filas para
 * que el historial sea auditable (nunca se borra).
 */
export async function cancelWorkoutSession(sessionId: string): Promise<void> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'cancelada',
      finished_at: null,
      current_participant_id: null,
      rest_timer_state: 'detenido',
      rest_timer_remaining: 0,
      rest_timer_ends_at: null,
    })
    .eq('id', sessionId)
    .eq('status', 'en_curso')
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('La sesión ya no está en curso.');
  }
}
