/**
 * Punto único de entrada al tema.
 *
 * En lugar de importar archivos sueltos, el resto de la app hace:
 *   import { useTheme, spacing } from '@/ui/theme';
 *
 * Si algún día cambia la estructura interna, solo se toca este archivo.
 */
export { darkColors, lightColors, type ThemeColors } from './colors';
export { radius, spacing } from './spacing';
export { typography } from './typography';
export { useTheme, type Theme } from './useTheme';
