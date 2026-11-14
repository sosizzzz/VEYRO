/**
 * Datos falsos de sesiones para desarrollar la interfaz sin base de datos.
 *
 * ¿Por qué existen?
 * La pantalla de entrenamiento, el resumen y el historial necesitan datos con
 * una forma concreta. Si esperamos a tener la base de datos conectada, no se
 * puede avanzar en paralelo. Estos objetos cumplen el contrato CT-01 y se
 * pueden pintar hoy; mañana se sustituyen por datos reales sin cambiar la
 * interfaz.
 *
 * Los identificadores son inventados: no existen en Supabase y no deben
 * guardarse. Los importes de peso son kilos y los tiempos, segundos.
 */
import type {
  SessionExerciseWithSets,
  SessionSet,
  WorkoutSessionDetail,
} from '@/types/workout';

/** Atajo para no repetir la estructura de una serie en cada ejemplo. */
function makeSet(overrides: Partial<SessionSet> & Pick<SessionSet, 'id' | 'set_number'>): SessionSet {
  return {
    session_exercise_id: '00000000-0000-4000-8000-000000000000',
    participant_id: '11111111-1111-4111-8111-111111111111',
    target_weight: null,
    target_reps: null,
    target_time_seconds: null,
    actual_weight: null,
    actual_reps: null,
    actual_time_seconds: null,
    status: 'pendiente',
    completed_at: null,
    client_operation_id: overrides.id,
    ...overrides,
  };
}

/**
 * Sesión EN CURSO de ejemplo.
 *
 * Sirve para pintar la pantalla de entrenamiento: un ejercicio ya completado,
 * otro pendiente y un temporizador detenido en 60 segundos.
 */
export const FIXTURE_SESSION_IN_PROGRESS: WorkoutSessionDetail = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  owner_id: '99999999-9999-4999-8999-999999999999',
  routine_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  mode: 'individual',
  status: 'en_curso',
  started_at: '2026-11-14T18:00:00.000Z',
  finished_at: null,
  current_participant_id: '11111111-1111-4111-8111-111111111111',
  rest_timer_seconds: 60,
  rest_timer_state: 'detenido',
  rest_timer_remaining: 60,
  participants: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user_id: '99999999-9999-4999-8999-999999999999',
      position: 1,
    },
  ],
  exercises: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      exercise_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      exercise_name: 'Press de banca',
      primary_muscles: ['Pecho', 'Tríceps'],
      icon: null,
      position: 1,
      status: 'completado',
      sets: [
        makeSet({
          id: '33333333-3333-4333-8333-333333333331',
          session_exercise_id: '22222222-2222-4222-8222-222222222222',
          set_number: 1,
          target_weight: 60,
          target_reps: 10,
          actual_weight: 60,
          actual_reps: 10,
          status: 'completada',
          completed_at: '2026-11-14T18:05:00.000Z',
        }),
        makeSet({
          id: '33333333-3333-4333-8333-333333333332',
          session_exercise_id: '22222222-2222-4222-8222-222222222222',
          set_number: 2,
          target_weight: 60,
          target_reps: 10,
          actual_weight: 62.5,
          actual_reps: 8,
          status: 'completada',
          completed_at: '2026-11-14T18:09:00.000Z',
        }),
      ],
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      exercise_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      exercise_name: 'Dominadas',
      primary_muscles: ['Espalda', 'Bíceps', 'Antebrazos'],
      icon: null,
      position: 2,
      status: 'pendiente',
      sets: [
        makeSet({
          id: '55555555-5555-4555-8555-555555555551',
          session_exercise_id: '44444444-4444-4444-8444-444444444444',
          set_number: 1,
          target_reps: 8,
        }),
        makeSet({
          id: '55555555-5555-4555-8555-555555555552',
          session_exercise_id: '44444444-4444-4444-8444-444444444444',
          set_number: 2,
          target_reps: 8,
        }),
      ],
    },
  ],
};

/**
 * Sesión FINALIZADA de ejemplo.
 *
 * Sirve para el resumen y el historial: todo completado y con hora de fin.
 * Incluye un ejercicio de tiempo (plancha) para probar series sin peso.
 */
const FINISHED_EXERCISES: SessionExerciseWithSets[] = [
  {
    id: '66666666-6666-4666-8666-666666666666',
    session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    exercise_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    exercise_name: 'Sentadilla',
    primary_muscles: ['Cuádriceps', 'Glúteos'],
    icon: null,
    position: 1,
    status: 'completado',
    sets: [
      makeSet({
        id: '77777777-7777-4777-8777-777777777771',
        session_exercise_id: '66666666-6666-4666-8666-666666666666',
        set_number: 1,
        target_weight: 80,
        target_reps: 8,
        actual_weight: 80,
        actual_reps: 8,
        status: 'completada',
        completed_at: '2026-11-12T17:10:00.000Z',
      }),
      makeSet({
        id: '77777777-7777-4777-8777-777777777772',
        session_exercise_id: '66666666-6666-4666-8666-666666666666',
        set_number: 2,
        target_weight: 80,
        target_reps: 8,
        actual_weight: 80,
        actual_reps: 8,
        status: 'completada',
        completed_at: '2026-11-12T17:14:00.000Z',
      }),
    ],
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    exercise_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    exercise_name: 'Plancha',
    primary_muscles: ['Core'],
    icon: null,
    position: 2,
    status: 'completado',
    sets: [
      makeSet({
        id: '99999999-9999-4999-8999-999999999991',
        session_exercise_id: '88888888-8888-4888-8888-888888888888',
        set_number: 1,
        target_time_seconds: 60,
        actual_time_seconds: 60,
        status: 'completada',
        completed_at: '2026-11-12T17:20:00.000Z',
      }),
    ],
  },
];

export const FIXTURE_SESSION_FINISHED: WorkoutSessionDetail = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  owner_id: '99999999-9999-4999-8999-999999999999',
  routine_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  mode: 'individual',
  status: 'finalizada',
  started_at: '2026-11-12T17:00:00.000Z',
  finished_at: '2026-11-12T17:25:00.000Z',
  current_participant_id: '11111111-1111-4111-8111-111111111111',
  rest_timer_seconds: 90,
  rest_timer_state: 'detenido',
  rest_timer_remaining: 90,
  participants: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      user_id: '99999999-9999-4999-8999-999999999999',
      position: 1,
    },
  ],
  exercises: FINISHED_EXERCISES,
};

/** Lista cómoda para pantallas que recorren varias sesiones. */
export const FIXTURE_SESSIONS: WorkoutSessionDetail[] = [
  FIXTURE_SESSION_IN_PROGRESS,
  FIXTURE_SESSION_FINISHED,
];
