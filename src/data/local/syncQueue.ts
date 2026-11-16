/**
 * Cola de sincronización guardada en el móvil (tarea A-07).
 *
 * ¿Por qué AsyncStorage y no solo memoria?
 * Si la app se cierra con cambios sin enviar, la lista tiene que seguir ahí al
 * volver a abrir. AsyncStorage es el "archivador" de clave-valor de React
 * Native; sobrevive al cierre de la app.
 *
 * ¿Qué significa "idempotente"?
 * Que repetir una operación no hace daño. Aquí se consigue de dos formas:
 * 1) Las operaciones llevan un id fijo (por ejemplo `set:<idDeSerie>`), así que
 *   un segundo cambio de la misma serie sustituye al anterior en vez de añadir
 *   otro. Siempre se envía el valor más reciente.
 * 2)Las funciones de `sessionService` actualizan filas por id, nunca insertan
 *   duplicados. Reintentar no crea series nuevas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SyncOperation } from '@/types/sync';

/** Clave única donde vive la cola completa. */
const QUEUE_KEY = '@veyro/sync-queue';

/** Versión del formato. Si cambia la forma de los datos, se sube a 2. */
const STORAGE_VERSION = 1;

type StoredQueue = {
  version: number;
  operations: SyncOperation[];
};

/** Lee la cola. Si está corrupta, la descarta para no bloquear la app. */
async function readQueue(): Promise<SyncOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Partial<StoredQueue>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.operations)) {
      await AsyncStorage.removeItem(QUEUE_KEY);
      return [];
    }
    return parsed.operations;
  } catch {
    // JSON roto: no hay nada que recuperar.
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }
}

/** Escribe la cola completa. Siempre pasa por aquí para no duplicar código. */
async function writeQueue(operations: SyncOperation[]): Promise<void> {
  const stored: StoredQueue = { version: STORAGE_VERSION, operations };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(stored));
}

/**
 * Añade operaciones a la cola.
 *
 * Si ya existía una operación con el mismo `id`, se sustituye por la nueva.
 * Ejemplo: completar la serie 1 y omitirla un segundo después deja una sola
 * operación con el estado final (omitida). No se envían dos cambios raros.
 */
export async function enqueueSyncOperations(
  operations: SyncOperation[],
): Promise<void> {
  if (operations.length === 0) return;

  const current = await readQueue();
  const byId = new Map(current.map((operation) => [operation.id, operation]));
  for (const operation of operations) {
    byId.set(operation.id, operation);
  }
  await writeQueue([...byId.values()]);
}

/** Devuelve la cola de un usuario, ordenada por antigüedad (primero la vieja). */
export async function listSyncOperations(
  ownerId?: string,
): Promise<SyncOperation[]> {
  const operations = await readQueue();
  return operations
    .filter((operation) => !ownerId || operation.ownerId === ownerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Actualiza los contadores de intentos/error de una operación. */
export async function updateSyncOperation(
  id: string,
  patch: Partial<Pick<SyncOperation, 'attempts' | 'lastError'>>,
): Promise<void> {
  const operations = await readQueue();
  const index = operations.findIndex((operation) => operation.id === id);
  if (index === -1) return;

  operations[index] = { ...operations[index], ...patch };
  await writeQueue(operations);
}

/** Quita de la cola las operaciones que Supabase ya confirmó. */
export async function removeSyncOperations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const operations = await readQueue();
  await writeQueue(operations.filter((operation) => !ids.includes(operation.id)));
}

/** Cuenta las operaciones pendientes de un usuario. */
export async function countSyncOperations(ownerId?: string): Promise<number> {
  return (await listSyncOperations(ownerId)).length;
}

/** Solo para tests: deja la cola vacía. */
export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
