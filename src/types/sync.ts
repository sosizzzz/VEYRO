/**
 * Contrato CT-04: sincronización con Supabase (tarea A-07).
 *
 * ¿Qué problema resuelve?
 * Cuando el móvil no tiene red, los cambios de un entrenamiento se guardan en
 * el dispositivo (A-06) pero no llegan a la nube. En lugar de perderlos o
 * enseñar un error alarmante, se apuntan en una "cola" (una lista de tareas
 * pendientes). En cuanto vuelve la conexión, la cola se envía sola.
 *
 * ¿Por qué hay un tipo por operación?
 * Porque cada tabla requiere una llamada distinta:
 * - `session`: cabecera de la sesión (estado, temporizador, turno).
 * - `exercise_status`: estado de un ejercicio.
 * - `set_result`: resultado real de una serie.
 * Así TypeScript avisa si intentamos guardar una serie donde va un ejercicio.
 */
import type { SessionExercise, SessionSet, WorkoutSession } from '@/types/workout';

/** Envoltorio común a todas las operaciones de la cola. */
type SyncOperationBase = {
  /** Identificador único de la operación. Dos cambios del mismo elemento comparten id: el último gana. */
  id: string;
  /** Dueño de los datos. Evita que, al cambiar de cuenta, se envíen operaciones ajenas. */
  ownerId: string;
  /** Sesión a la que pertenece el cambio. */
  sessionId: string;
  /** Momento en que se apuntó (ISO 8601). */
  createdAt: string;
  /** Cuántas veces se ha intentado enviar. Sirve para depurar fallos repetidos. */
  attempts: number;
  /** Último mensaje de error, o `null` si nunca ha fallado. */
  lastError: string | null;
};

/** Una operación pendiente. Es una unión discriminada por `kind`. */
export type SyncOperation =
  | (SyncOperationBase & {
      kind: 'session';
      payload: { session: WorkoutSession };
    })
  | (SyncOperationBase & {
      kind: 'exercise_status';
      payload: { exerciseId: string; status: SessionExercise['status'] };
    })
  | (SyncOperationBase & {
      kind: 'set_result';
      payload: { set: SessionSet };
    });

/** Estado que se muestra al usuario (M-08). */
export type SyncState =
  | 'synced' // todo enviado
  | 'pending' // hay cambios esperando
  | 'syncing' // se está enviando ahora
  | 'error'; // al menos un cambio falló varias veces

/** Resumen que consume el indicador de la interfaz. */
export type SyncStatus = {
  state: SyncState;
  pendingCount: number;
  isOnline: boolean;
  lastError: string | null;
};
