/**
 * Estilos de texto de VEYRO.
 *
 * Usamos una tipografía propia (Inter) incluida dentro de la app, no la del
 * teléfono. Así todos los usuarios ven la misma forma de letra en Android y en
 * iPhone, aunque su sistema use otra fuente por defecto.
 *
 * Cada peso (normal, seminegrita, negrita) es un archivo distinto. Por eso ya
 * no se usa `fontWeight`: en React Native, mezclar una fuente propia con
 * `fontWeight` puede hacer que Android ignore la fuente y vuelva a la del
 * sistema.
 */
export const fontFamilies = {
  /** Texto normal. */
  regular: 'Inter_400Regular',
  /** Títulos de tarjeta y etiquetas que deben destacar sin gritar. */
  semibold: 'Inter_600SemiBold',
  /** Título principal de pantalla. */
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  /** Título grande de pantalla, por ejemplo "Inicio". */
  title: { fontSize: 28, fontFamily: fontFamilies.bold },

  /** Título de sección o de tarjeta. */
  subtitle: { fontSize: 20, fontFamily: fontFamilies.semibold },

  /** Texto normal. */
  body: { fontSize: 16, fontFamily: fontFamilies.regular },

  /** Texto secundario: ayudas, fechas, descripciones. */
  caption: { fontSize: 13, fontFamily: fontFamilies.regular },
} as const;
