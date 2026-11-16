/**
 * Envío de la cola a Supabase (tarea A-07).
 *
 * ¿Qué hace?
 * 1) Pregunta si hay red (NetInfo). Si no hay, no intenta nada: la cola sigue
 *   guardada en el móvil y se enviará más tarde.
 * 2) Recorre las operaciones en orden y llama al servicio correspondiente.
 * 3) Si una funciona, la quita de la cola. Si falla, anota el error y para: así
 *   no se desordenan los cambios (una serie no puede enviarse antes que su
 *   ejercicio, por ejemplo).
 *
 * Las funciones que se llaman son idempotentes: actualizan filas por id. Un
 * reintento nunca crea datos duplicados.
 */
import NetInfo from '@react-native-community/netinfo';

import {
  countSyncOperations,
  listSyncOperations,
  removeSyncOperations,
  updateSyncOperation,
} from '@/data/local/syncQueue';
import { getErrorMessage } from '@/lib/errors';
import type { SyncOperation, SyncState, SyncStatus } from '@/types/sync';

import {
  saveSessionExerciseStatus,
  saveSessionSetResult,
  saveWorkoutSession,
} from './sessionService';

/**
 * Evita que dos disparadores a la vez (un cambio y el evento "volvió la red")
 * envíen la misma cola dos veces. Mientras hay un envío en curso, los demás
 * esperan a ese mismo promise.
 */
let activeFlush: Promise<void> | null = null;

/** Consulta real de conectividad. Ante duda, intentamos enviar. */
export async function checkInternetConnection(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    // Si NetInfo falla, mejor intentar y que Supabase diga si no hay red.
    return true;
  }
}

/** Envía una operación según su tipo. El discriminante `kind` lo decide todo. */
async function dispatch(operation: SyncOperation): Promise<void> {
  switch (operation.kind) {
    case 'session':
      return saveWorkoutSession(operation.payload.session);
    case 'exercise_status':
      return saveSessionExerciseStatus(
        operation.payload.exerciseId,
        operation.payload.status,
      );
    case 'set_result':
      return saveSessionSetResult(operation.payload.set);
  }
}

/**
 * Intenta vaciar la cola.
 *
 * Ejemplo:
 * ```ts
 * await enqueueSyncOperations(operaciones);
 * await flushSyncQueue(usuario.id); // solo operaciones de ese usuario
 * ```
 */
export async function flushSyncQueue(ownerId?: string): Promise<void> {
  if (activeFlush) return activeFlush;

  activeFlush = (async () => {
    if (!(await checkInternetConnection())) return;

    const operations = await listSyncOperations(ownerId);
    for (const operation of operations) {
      try {
        await dispatch(operation);
        await removeSyncOperations([operation.id]);
      } catch (cause) {
        // Se conserva la operación para reintentarla cuando vuelva la red.
        await updateSyncOperation(operation.id, {
          attempts: operation.attempts + 1,
          lastError: getErrorMessage(cause, 'No se pudo sincronizar.'),
        });
        break;
      }
    }
  })().finally(() => {
    activeFlush = null;
  });

  return activeFlush;
}

/** Resumen para el indicador de sincronización (M-08). */
export async function getSyncStatus(ownerId?: string): Promise<SyncStatus> {
  const [pendingCount, isOnline, operations] = await Promise.all([
    countSyncOperations(ownerId),
    checkInternetConnection(),
    listSyncOperations(ownerId),
  ]);

  const lastError =
    [...operations].reverse().find((operation) => operation.lastError)?.lastError ?? null;

  let state: SyncState = 'synced';
  if (pendingCount > 0) {
    state = !isOnline ? 'pending' : lastError ? 'error' : 'pending';
  }

  return { state, pendingCount, isOnline, lastError };
}
