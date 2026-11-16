/**
 * Tests del guardado local (A-06).
 *
 * AsyncStorage no existe en Node, así que se sustituye por el mock oficial
 * que trae el paquete. Los tests comprueban el contrato, no los detalles de
 * AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FIXTURE_SESSION_FINISHED,
  FIXTURE_SESSION_IN_PROGRESS,
} from '@/data/fixtures';
import {
  clearLocalSession,
  loadActiveLocalSession,
  loadLocalSession,
  saveLocalSession,
} from './sessionStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // El mock oficial se carga con require porque `jest.mock` se eleva por
  // encima de los imports; un import normal llegaría demasiado tarde.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('sessionStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('guarda y recupera la sesión activa', async () => {
    await saveLocalSession(FIXTURE_SESSION_IN_PROGRESS);

    const active = await loadActiveLocalSession(FIXTURE_SESSION_IN_PROGRESS.owner_id);

    expect(active).toEqual(FIXTURE_SESSION_IN_PROGRESS);
  });

  it('lee una sesión concreta por su id', async () => {
    await saveLocalSession(FIXTURE_SESSION_IN_PROGRESS);

    const detail = await loadLocalSession(FIXTURE_SESSION_IN_PROGRESS.id);

    expect(detail?.id).toBe(FIXTURE_SESSION_IN_PROGRESS.id);
    expect(detail?.exercises).toHaveLength(FIXTURE_SESSION_IN_PROGRESS.exercises.length);
  });

  it('devuelve null si no hay sesión guardada', async () => {
    await expect(loadActiveLocalSession('otro-usuario')).resolves.toBeNull();
  });

  it('no entrega la sesión a otra cuenta', async () => {
    await saveLocalSession(FIXTURE_SESSION_IN_PROGRESS);

    const otherUser = await loadActiveLocalSession('otro-usuario');

    expect(otherUser).toBeNull();
  });

  it('ignora y limpia una sesión que ya no está en curso', async () => {
    await saveLocalSession(FIXTURE_SESSION_FINISHED);

    const active = await loadActiveLocalSession(FIXTURE_SESSION_FINISHED.owner_id);

    expect(active).toBeNull();
    // La segunda lectura ya no encuentra ni el índice ni la sesión.
    await expect(loadLocalSession(FIXTURE_SESSION_FINISHED.id)).resolves.toBeNull();
  });

  it('borra la copia local al terminar o cancelar', async () => {
    await saveLocalSession(FIXTURE_SESSION_IN_PROGRESS);

    await clearLocalSession(FIXTURE_SESSION_IN_PROGRESS.id);

    await expect(loadLocalSession(FIXTURE_SESSION_IN_PROGRESS.id)).resolves.toBeNull();
    await expect(
      loadActiveLocalSession(FIXTURE_SESSION_IN_PROGRESS.owner_id),
    ).resolves.toBeNull();
  });

  it('sobrevive a un JSON corrupto sin romper la app', async () => {
    await AsyncStorage.setItem(`@veyro/session/${FIXTURE_SESSION_IN_PROGRESS.id}`, '{roto');
    await AsyncStorage.setItem('@veyro/active-session-id', FIXTURE_SESSION_IN_PROGRESS.id);

    await expect(
      loadActiveLocalSession(FIXTURE_SESSION_IN_PROGRESS.owner_id),
    ).resolves.toBeNull();
  });
});
