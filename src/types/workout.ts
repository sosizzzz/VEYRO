/**
 * Contrato CT-01 · Sesiones de entrenamiento.
 *
 * Este archivo es la **forma oficial** de los datos de una sesión. Lo usan:
 * - el motor de estados (`src/domain/workout-engine`),
 * - los servicios de sesión (`src/modules/workouts`),
 * - la pantalla de entrenamiento y el historial.
 *
 * ¿Por qué un archivo aparte?
 * Porque si cada parte inventa sus propios nombres, al unirlas hay que
 * reescribir código. Aquí están los nombres y los valores permitidos una sola
 * vez, y todos trabajan con ellos.
 *
 * Los nombres de los campos (snake_case, con guiones bajos) son **los mismos
 * que las columnas de la base de datos**. Así no hay que traducir al guardar.
 *
 * Ejemplo de uso:
 * ```ts
 * const sesion: WorkoutSession = {
 *   id: '...',
 *   owner_id: '...',
 *   routine_id: '...',
 *   mode: 'individual',
 *   status: 'en_curso',
 *   started_at: new Date().toISOString(),
 *   finished_at: null,
 *   current_participant_id: '...',
 *   rest_timer_seconds: DEFAULT_REST_TIMER_SECONDS,
 *   rest_timer_state: 'detenido',
 *   rest_timer_remaining: DEFAULT_REST_TIMER_SECONDS,
 * };
 * ```
 */

/** Modalidad de la sesión. En el MVP solo se crea `individual`. */
export type WorkoutMode = 'individual' | 'compartida';

/**
 * Estado global de la sesión:
 * - `en_curso`: se está entrenando.
 * - `finalizada`: se terminó y cuenta como entrenamiento completado.
 * - `cancelada`: se descartó; **no** cuenta como entrenamiento.
 */
export type WorkoutSessionStatus = 'en_curso' | 'finalizada' | 'cancelada';

/**
 * Estado del temporizador de descanso:
 * - `detenido`: parado en el valor configurado.
 * - `corriendo`: cuenta atrás en marcha.
 * - `pausado`: se detuvo a mitad sin reiniciar.
 */
export type RestTimerState = 'detenido' | 'corriendo' | 'pausado';

/**
 * Estado de un ejercicio dentro de la sesión:
 * - `pendiente`: aún se puede hacer.
 * - `saltado`: se dejó para después; **sigue pendiente** y debe recuperarse.
 * - `omitido`: se descartó definitivamente en esta sesión.
 * - `completado`: todas sus series terminadas (o marcado como hecho).
 */
export type SessionExerciseStatus = 'pendiente' | 'saltado' | 'omitido' | 'completado';

/**
 * Estado de una serie:
 * - `pendiente`: todavía no se ha registrado.
 * - `completada`: se registró el resultado real.
 * - `omitida`: se decidió no hacerla.
 */
export type SessionSetStatus = 'pendiente' | 'completada' | 'omitida';

/**
 * Una sesión de entrenamiento.
 *
 * Es la fila madre: los participantes, los ejercicios y las series cuelgan de
 * ella. `status` manda sobre el resto: una sesión finalizada o cancelada no
 * debe seguir modificándose (la interfaz y los servicios lo comprueban; la
 * base de datos guarda el valor).
 */
export type WorkoutSession = {
  id: string;
  /** Dueño de la sesión. En el futuro, el dispositivo controlador. */
  owner_id: string;
  /** Rutina que se copió al empezar. */
  routine_id: string;
  mode: WorkoutMode;
  status: WorkoutSessionStatus;
  /** Momento en que se pulsó “empezar” (ISO 8601). */
  started_at: string;
  /** Momento de finalización; `null` mientras está en curso o cancelada. */
  finished_at: string | null;
  /**
   * Participante al que le toca ahora.
   *
   * En el MVP es el único participante. Se guarda como identificador suelto
   * (sin clave foránea) porque `session_participants` también apunta a la
   * sesión: una referencia mutua entre las dos tablas obligaría a insertarlas
   * en un orden imposible.
   */
  current_participant_id: string | null;
  /** Descanso configurado, en segundos. Por defecto 60. */
  rest_timer_seconds: number;
  rest_timer_state: RestTimerState;
  /** Segundos que quedaban cuando se guardó por última vez. */
  rest_timer_remaining: number;
};

/**
 * Persona que participa en una sesión.
 *
 * En el MVP hay **exactamente una fila** por sesión, pero existe desde el
 * principio para no tener que migrar datos cuando lleguen las sesiones
 * compartidas. `user_id` es el dueño real de los resultados.
 */
export type SessionParticipant = {
  id: string;
  session_id: string;
  user_id: string;
  /** Orden de turno (1, 2, 3…). En el MVP siempre 1. */
  position: number;
};

/**
 * Ejercicio dentro de una sesión: una **foto** del ejercicio al empezar.
 *
 * Se copian nombre, músculos e icono para que el historial siga siendo legible
 * aunque después se renombre o archive el ejercicio original.
 */
export type SessionExercise = {
  id: string;
  session_id: string;
  /** Referencia al ejercicio original (puede estar archivado después). */
  exercise_id: string;
  /** Copia del nombre en el momento de iniciar. */
  exercise_name: string;
  /** Copia de los músculos principales (1 a 3), igual que en `exercises`. */
  primary_muscles: string[];
  /** Copia del icono; puede ser `null`. */
  icon: string | null;
  /** Orden original dentro de la rutina (1, 2, 3…). */
  position: number;
  status: SessionExerciseStatus;
};

/**
 * Una serie de un ejercicio, con su objetivo y su resultado real.
 *
 * `participant_id` dice **quién** hizo la serie. En el MVP coincide con el
 * dueño de la sesión, pero se guarda aparte para las sesiones compartidas.
 */
export type SessionSet = {
  id: string;
  session_exercise_id: string;
  participant_id: string;
  /** Número de serie dentro del ejercicio: 1, 2, 3… */
  set_number: number;
  /** Objetivo copiado de la rutina; `null` si no se configuró. */
  target_weight: number | null;
  target_reps: number | null;
  target_time_seconds: number | null;
  /** Resultado real; `null` mientras no se registra. */
  actual_weight: number | null;
  actual_reps: number | null;
  actual_time_seconds: number | null;
  status: SessionSetStatus;
  /** Momento en que se completó la serie; `null` si no se completó. */
  completed_at: string | null;
  /**
   * Identificador único de la operación que creó o modificó la serie.
   *
   * Sirve para que, si el móvil reintenta un guardado por falta de red, el
   * servidor rechace el duplicado en lugar de crear dos series iguales.
   */
  client_operation_id: string;
};

/** Ejercicio de sesión con sus series ya cargadas (para pantallas y resumen). */
export type SessionExerciseWithSets = SessionExercise & {
  sets: SessionSet[];
};

/**
 * Sesión completa con participantes y ejercicios.
 *
 * Es lo que devuelve el detalle de una sesión y lo que necesita la pantalla de
 * entrenamiento para pintarse con una sola lectura.
 */
export type WorkoutSessionDetail = WorkoutSession & {
  participants: SessionParticipant[];
  exercises: SessionExerciseWithSets[];
};

/** Valor inicial aprobado del temporizador de descanso (PROJECT.md §6). */
export const DEFAULT_REST_TIMER_SECONDS = 60;

/** Lista cerrada de estados de sesión, útil para validar y para la interfaz. */
export const WORKOUT_SESSION_STATUSES: readonly WorkoutSessionStatus[] = [
  'en_curso',
  'finalizada',
  'cancelada',
];

/** Lista cerrada de estados de ejercicio. */
export const SESSION_EXERCISE_STATUSES: readonly SessionExerciseStatus[] = [
  'pendiente',
  'saltado',
  'omitido',
  'completado',
];

/** Lista cerrada de estados de serie. */
export const SESSION_SET_STATUSES: readonly SessionSetStatus[] = [
  'pendiente',
  'completada',
  'omitida',
];
