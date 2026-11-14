/**
 * Guardado local de la sesión en curso (tarea A-06).
 *
 * ¿Por qué existe?
 * Una serie no puede perderse por quedarse sin cobertura. Antes de intentar
 * enviarla a Supabase, se guarda una copia completa de la sesión en el móvil
 * con AsyncStorage (el almacenamiento de clave-valor de React Native).
 *
 * ¿Qué se guarda?
 * Una "foto" de la sesión: ejercicio actual, series, estados, turno y
 * temporizador. Es la misma forma que devuelve `getWorkoutSessionDetail`, así
 * que se puede reconstruir el motor sin conversiones raras.
 *
 * La cola de operaciones pendientes (reintentos finos) es la tarea A-07.
 * Aquí solo se garantiza que el estado no se pierda y se pueda reanudar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutSessionDetail } from '@/types/workout';

/** Versión del formato guardado. Subirla permite migrar datos viejos. */
const STORAGE_VERSION = 1;

/** Clave donde se apunta cuál es la sesión activa. */
const ACTIVE_SESSION_KEY = '@veyro/active-session-id';

/** Clave del contenido de una sesión concreta. */
function sessionKey(sessionId: string): string {
  return `@veyro/session/${sessionId}`;
}

/** Envoltorio guardado: versión + fecha + sesión. La fecha ayuda a depurar. */
type StoredSession = {
  version: number;
  saved_at: string;
  detail: WorkoutSessionDetail;
};

/**
 * Comprueba mínimamente que lo leído tiene forma de sesión.
 *
 * No usamos Zod aquí para no cargar validaciones en cada arranque; el objetivo
 * es solo no romper la app si el almacenamiento se corrompe.
 */
function looksLikeSession(value: unknown): value is WorkoutSessionDetail {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.owner_id === 'string' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.participants) &&
    Array.isArray(candidate.exercises)
  );
}

/**
 * Guarda la sesión en el móvil y la marca como activa.
 *
 * Ejemplo:
 * ```ts
 * await saveLocalSession(detail);
 * // Si la app se cierra ahora, `loadActiveLocalSession` la recupera.
 * ```
 *
 * Se escribe primero la sesión y después el índice. Así el índice nunca
 * apunta a una sesión que todavía no existe.
 */
export async function saveLocalSession(detail: WorkoutSessionDetail): Promise<void> {
  const stored: StoredSession = {
    version: STORAGE_VERSION,
    saved_at: new Date().toISOString(),
    detail,
  };

  await AsyncStorage.setItem(sessionKey(detail.id), JSON.stringify(stored));
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, detail.id);
}

/**
 * Lee una sesión concreta. Devuelve `null` si no existe o está corrupta.
 *
 * Si está corrupta, se borra para que no vuelva a fallar en cada arranque.
 */
export async function loadLocalSession(
  sessionId: string,
): Promise<WorkoutSessionDetail | null> {
  const raw = await AsyncStorage.getItem(sessionKey(sessionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed.version !== STORAGE_VERSION || !looksLikeSession(parsed.detail)) {
      await AsyncStorage.removeItem(sessionKey(sessionId));
      return null;
    }
    return parsed.detail;
  } catch {
    // JSON roto: no hay nada que recuperar.
    await AsyncStorage.removeItem(sessionKey(sessionId));
    return null;
  }
}

/**
 * Devuelve la sesión activa del usuario, si la hay.
 *
 * `ownerId` evita que, tras cerrar sesión y entrar con otra cuenta, se
 * recupere el entrenamiento de la persona anterior.
 * Solo se devuelven sesiones `en_curso`; una finalizada o cancelada se limpia.
 */
export async function loadActiveLocalSession(
  ownerId: string,
): Promise<WorkoutSessionDetail | null> {
  const activeId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!activeId) return null;

  const detail = await loadLocalSession(activeId);
  if (!detail) {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }

  if (detail.owner_id !== ownerId) {
    // No se borra: puede pertenecer a otra cuenta que vuelva más tarde.
    return null;
  }

  if (detail.status !== 'en_curso') {
    await clearLocalSession(detail.id);
    return null;
  }

  return detail;
}

/**
 * Borra la copia local de una sesión.
 *
 * Se llama solo cuando el servidor ha confirmado que la sesión terminó o se
 * canceló. Si se borrara antes y fallara la red, se perdería el progreso.
 */
export async function clearLocalSession(sessionId: string): Promise<void> {
  await AsyncStorage.removeItem(sessionKey(sessionId));

  const activeId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (activeId === sessionId) {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}
