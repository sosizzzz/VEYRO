/**
 * Utilidades para mostrar errores de forma útil.
 *
 * ¿Por qué existe?
 * Supabase no siempre devuelve un `Error` normal: muchas veces devuelve un
 * objeto parecido a `{ message, details, hint, code }`. Si solo miramos
 * `error instanceof Error`, acabamos enseñando un mensaje genérico y
 * perdemos la pista de qué falló de verdad.
 */

type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

/** Convierte cualquier error (Error, texto u objeto de Supabase) en texto. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as ErrorLike;

    // `message` es lo importante; `details` y `hint` ayudan a depurar.
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (part): part is string => typeof part === 'string' && part.trim().length > 0,
    );

    if (parts.length > 0) {
      const code = typeof candidate.code === 'string' ? ` (${candidate.code})` : '';
      return `${parts.join(' · ')}${code}`;
    }
  }

  return fallback;
}
