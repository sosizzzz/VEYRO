/**
 * Tipos propios del acceso y del perfil.
 *
 * `Profile` describe una fila de la tabla `public.profiles`
 * (ver DATABASE.md). Mantener este tipo aquí evita repetir la forma
 * de los datos en cada pantalla.
 */

export type Profile = {
  /** Mismo identificador que el usuario de autenticación. */
  id: string;

  /** Nombre visible en la app. */
  display_name: string;

  /** URL del avatar, si algún día se añade. */
  avatar_url: string | null;

  /** Fecha de creación en formato ISO 8601. */
  created_at: string;
};
