/**
 * Tests de la cola de sincronización (A-07).
 *
 * Comprueban las garantías importantes: que los cambios sobreviven al cierre
 * (AsyncStorage), que no se duplican y que una cuenta no ve operaciones de otra.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FIXTURE_SESSION_IN_PROGRESS } from '@/data/fixtures';
import type { SyncOperation } from '@/types/sync';

import {
  clearSyncQueue,
  countSyncOperations,
  enqueueSyncOperations,
  listSyncOperations,
  removeSyncOperations,
  updateSyncOperation,
} from './syncQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  // El mock oficial se carga con require porque `jest.mock` se eleva por
  // encima de los imports; un import normal llegaría demasiado tarde.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const session = FIXTURE_SESSION_IN_PROGRESS;
const sampleSet = session.exercises[0].sets[0];

function makeSetOperation(status: 'pendiente' | 'completada'): SyncOperation {
  return {
    id: `set:${sampleSet.id}`,
    ownerId: session.owner_id,
    sessionId: session.id,
    kind: 'set_result',
    payload: { set: { ...sampleSet, status } },
    createdAt: '2026-11-14T18:00:00.000Z',
    attempts: 0,
    lastError: null,
  };
}

describe('syncQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda y devuelve una operación', async () => {
    await enqueueSyncOperations([makeSetOperation('completada')]);

    const operations = await listSyncOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0].kind).toBe('set_result');
  });

  it('sustituye la operación antigua por la más reciente (idempotencia)', async () => {
    await enqueueSyncOperations([makeSetOperation('pendiente')]);
    await enqueueSyncOperations([makeSetOperation('completada')]);

    const operations = await listSyncOperations();

    expect(operations).toHaveLength(1);
    expect(operations[0].kind === 'set_result' && operations[0].payload.set.status).toBe(
      'completada',
    );
  });

  it('filtra las operaciones por dueño', async () => {
    await enqueueSyncOperations([makeSetOperation('completada')]);

    expect(await countSyncOperations(session.owner_id)).toBe(1);
    expect(await countSyncOperations('otro-usuario')).toBe(0);
  });

  it('anota intentos y errores para depurar fallos', async () => {
    await enqueueSyncOperations([makeSetOperation('completada')]);

    await updateSyncOperation(`set:${sampleSet.id}`, {
      attempts: 2,
      lastError: 'Sin conexión',
    });
    const operations = await listSyncOperations();

    expect(operations[0].attempts).toBe(2);
    expect(operations[0].lastError).toBe('Sin conexión');
  });

  it('quita de la cola solo las operaciones confirmadas', async () => {
    await enqueueSyncOperations([makeSetOperation('completada')]);
    await removeSyncOperations([`set:${sampleSet.id}`]);

    expect(await countSyncOperations()).toBe(0);
  });

  it('descarta una cola corrupta sin romper la app', async () => {
    await AsyncStorage.setItem('@veyro/sync-queue', 'esto no es JSON');

    expect(await listSyncOperations()).toEqual([]);
  });

  it('clearSyncQueue deja la cola vacía', async () => {
    await enqueueSyncOperations([makeSetOperation('completada')]);
    await clearSyncQueue();

    expect(await countSyncOperations()).toBe(0);
  });
});
