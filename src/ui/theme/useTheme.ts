/**
 * Hook (función reutilizable de React) que entrega el tema activo.
 *
 * Un "hook" es una función que se llama dentro de un componente y le da
 * acceso a cosas de React, en este caso al modo claro/oscuro del móvil.
 *
 * Uso:
 *   const { colors } = useTheme();
 *   <Text style={{ color: colors.text }}>Hola</Text>
 */
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

/** Todo lo que un componente necesita para pintarse. */
export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  /** `true` si el móvil está en modo oscuro. Útil para iconos y mapas. */
  isDark: boolean;
};

export function useTheme(): Theme {
  // `useColorScheme` devuelve 'light', 'dark' o null (sin preferencia).
  // Si no hay preferencia, usamos el tema claro.
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    isDark,
  };
}
