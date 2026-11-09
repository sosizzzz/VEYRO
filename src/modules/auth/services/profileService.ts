/**
 * Lectura del perfil del usuario.
 *
 * La fila la crea la base de datos automáticamente al registrarse
 * (disparador `on_auth_user_created`). Aquí solo se lee.
 */
import { supabase } from '@/data/supabase/client';

import type { Profile } from '../types';

/** Columnas que se piden a la base de datos, en una sola lista. */
const PROFILE_COLUMNS = 'id, display_name, avatar_url, created_at';

/**
 * Devuelve el perfil del usuario o `null` si todavía no existe.
 *
 * `maybeSingle()` se usa en lugar de `single()` porque "no hay fila" es un
 * caso posible y no debe tratarse como un error.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Supabase devuelve `unknown` cuando no hay tipos generados de la base de
  // datos. Se convierte aquí, en la capa de datos, y no en las pantallas.
  return (data as Profile | null) ?? null;
}
