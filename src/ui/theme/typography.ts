/**
 * Estilos de texto de VEYRO.
 *
 * Se definen una vez para que todos los títulos y párrafos midan igual.
 * `as const` es necesario para que TypeScript entienda que `fontWeight`
 * es un valor concreto (`'700'`) y no un texto cualquiera.
 */
export const typography = {
  /** Título grande de pantalla, por ejemplo "Inicio". */
  title: { fontSize: 28, fontWeight: '700' },

  /** Título de sección o de tarjeta. */
  subtitle: { fontSize: 20, fontWeight: '600' },

  /** Texto normal. */
  body: { fontSize: 16, fontWeight: '400' },

  /** Texto secundario: ayudas, fechas, descripciones. */
  caption: { fontSize: 13, fontWeight: '400' },
} as const;
