/**
 * Traducción de errores de Supabase al español.
 *
 * Supabase responde en inglés y con mensajes técnicos. Enseñar
 * "Invalid login credentials" a una persona que está entrenando no ayuda.
 *
 * Estrategia:
 * 1. Buscar una traducción conocida por un fragmento del mensaje original.
 * 2. Si no hay traducción, mostrar un texto genérico y dejar el original en
 *    la consola para poder depurarlo.
 */

/** Fragmentos de mensajes de Supabase → texto para el usuario. */
const AUTH_MESSAGES: readonly (readonly [string, string])[] = [
  ['Invalid login credentials', 'Correo o contraseña incorrectos.'],
  ['Email not confirmed', 'Todavía no has confirmado tu correo. Revisa tu bandeja de entrada.'],
  ['User already registered', 'Ya existe una cuenta con ese correo electrónico.'],
  ['already registered', 'Ya existe una cuenta con ese correo electrónico.'],
  ['Password should be at least', 'La contraseña es demasiado corta.'],
  ['Unable to validate email address', 'El correo no tiene un formato válido.'],
  ['Email rate limit exceeded', 'Has hecho demasiados intentos. Espera un minuto y vuelve a probar.'],
  ['For security purposes', 'Por seguridad, espera unos segundos antes de volver a intentarlo.'],
  ['Failed to fetch', 'No hay conexión con el servidor. Comprueba tu conexión a internet.'],
  ['Network request failed', 'No hay conexión con el servidor. Comprueba tu conexión a internet.'],
];

/**
 * Convierte cualquier error en un mensaje legible.
 * Acepta `unknown` porque en un `catch` no se sabe qué llega.
 */
export function translateAuthError(error: unknown): string {
  const original =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const match = AUTH_MESSAGES.find(([fragmento]) => original.includes(fragmento));

  if (match) {
    return match[1];
  }

  // El detalle técnico queda en la consola del desarrollador, no en la pantalla.
  console.warn('[auth] Error no traducido:', original);
  return 'No se ha podido completar la operación. Inténtalo de nuevo.';
}
