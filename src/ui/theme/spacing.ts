/**
 * Escala de espaciados y radios de VEYRO.
 *
 * Regla: nunca se escriben números sueltos como `padding: 17`.
 * Se usa la escala. Así toda la app respira igual y un ajuste global
 * se hace cambiando una línea.
 *
 * La unidad es el "punto" lógico de React Native: se ve igual en móviles
 * de distinta densidad de pantalla.
 */

/** Separaciones: de la más pequeña a la más grande. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Redondeo de esquinas. `pill` sirve para botones totalmente redondeados. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
