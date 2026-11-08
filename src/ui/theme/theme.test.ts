/**
 * Primer test del proyecto.
 *
 * ¿Por qué probar el tema? Porque es la base visual de toda la app:
 * si el tema claro y el oscuro se desalinean (una clave falta, un color
 * se cae), todas las pantallas se rompen del mismo modo. Este test lo
 * detecta en un segundo, sin abrir el móvil.
 */
import { darkColors, lightColors, type ThemeColors } from './colors';
import { radius, spacing } from './spacing';

describe('tema', () => {
  it('el tema claro y el oscuro tienen exactamente las mismas claves', () => {
    // Ordenamos para comparar sin depender del orden de declaración.
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();

    expect(darkKeys).toEqual(lightKeys);
  });

  it('el tema oscuro es asignable al tipo ThemeColors', () => {
    // Esta comprobación es de TypeScript, no de ejecución: si `darkColors`
    // no cumple la forma, el proyecto no compila.
    const asTheme: ThemeColors = darkColors;

    expect(asTheme).toBeDefined();
  });

  it('la escala de espaciado crece de menor a mayor', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.md);
    expect(spacing.md).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xl);
    expect(spacing.xl).toBeLessThan(spacing.xxl);
  });

  it('los radios de esquina son positivos', () => {
    expect(radius.sm).toBeGreaterThan(0);
    expect(radius.md).toBeGreaterThan(radius.sm);
    expect(radius.lg).toBeGreaterThan(radius.md);
  });
});
