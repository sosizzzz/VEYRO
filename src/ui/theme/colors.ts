/**
 * Paleta de colores de VEYRO.
 *
 * ¿Por qué un archivo aparte y no colores sueltos por las pantallas?
 * Porque un color debe cambiar en un solo sitio. Si mañana se aprueba el
 * diseño visual definitivo (PROJECT.md §13), solo se toca este archivo.
 *
 * Los nombres describen el USO, no el color literal:
 * `background` significa "fondo de pantalla", no "blanco".
 * Así, si el fondo pasa a gris claro, ninguna pantalla necesita cambios.
 */

/**
 * Colores de marca y de estado.
 * Son iguales en tema claro y oscuro para que un "verde de mejora"
 * signifique lo mismo en cualquier modo.
 */
const sharedColors = {
  /** Azul de marca: botones principales, enlaces y pestaña activa. */
  primary: '#2F6BFF',

  /** Verde: una métrica ha mejorado. */
  success: '#22A06B',

  /** Amarillo: el peso ha mejorado. Es un nivel propio (PROJECT.md §9). */
  warning: '#E8A317',

  /** Rojo: una métrica ha empeorado, o una rutina pasada quedó pendiente. */
  danger: '#D64545',

  /** Azul de estado: rutina pendiente futura o de hoy en el calendario. */
  info: '#3B82F6',

  /** Gris: sin cambios respecto a la sesión anterior. */
  neutral: '#8A8F98',
} as const;

/** Colores del tema claro. */
export const lightColors = {
  ...sharedColors,
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
} as const;

/**
 * Colores del tema oscuro.
 * Mantiene las mismas claves que el tema claro: si añades una clave arriba,
 * TypeScript te avisará de que falta aquí.
 */
export const darkColors = {
  ...sharedColors,
  background: '#0B0F19',
  surface: '#151A24',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  border: '#27303F',
} as const;

/**
 * Forma que debe tener cualquier tema.
 * Se deriva del tema claro para no repetir la lista de claves a mano.
 */
export type ThemeColors = Record<keyof typeof lightColors, string>;
