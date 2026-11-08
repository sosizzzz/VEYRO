/**
 * Casos de uso de autenticación.
 *
 * Esta capa habla con Supabase y traduce sus respuestas a algo que la app
 * entiende. Las pantallas NO llaman a Supabase: llaman a estas funciones.
 *
 * Ventaja: si mañana cambia el sistema de acceso, las pantallas no se tocan.
 */
import { supabase } from '@/data/supabase/client';

import type { SignUpValues } from '../validation';

/** Resultado de intentar registrarse. */
export type SignUpResult = {
  /**
   * `true` cuando Supabase ha enviado un correo de confirmación y todavía
   * no hay sesión. `false` cuando el usuario ya está dentro.
   */
  needsEmailConfirmation: boolean;
};

/**
 * Crea una cuenta nueva.
 *
 * El nombre se envía en `options.data`. Ese dato llega a
 * `raw_user_meta_data` y lo usa el disparador de la base de datos para crear
 * el perfil automáticamente (ver supabase/migrations/001_profiles.sql).
 */
export async function signUpWithEmail(
  values: Pick<SignUpValues, 'displayName' | 'email' | 'password'>,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      // Va al disparador `handle_new_user` de PostgreSQL.
      data: { display_name: values.displayName.trim() },
    },
  });

  if (error) {
    throw error;
  }

  // Si `session` es null, Supabase exige confirmar el correo antes de entrar.
  return { needsEmailConfirmation: data.session === null };
}

/** Inicia sesión con correo y contraseña. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

/**
 * Cierra la sesión en este dispositivo.
 * El token guardado en el móvil se borra.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
