/**
 * Botón reutilizable.
 *
 * Todas las pantallas usan este componente en lugar de crear botones sueltos.
 * Ventajas: mismo tamaño, mismo color, mismo estado de carga y misma
 * accesibilidad en toda la app.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { fontFamilies, useTheme } from '../theme';

type ButtonProps = {
  /** Texto del botón. */
  label: string;
  /** Qué hacer al pulsar. */
  onPress: () => void;
  /** Muestra un indicador y bloquea pulsaciones mientras se ejecuta. */
  loading?: boolean;
  /** Desactiva el botón sin mostrar el indicador. */
  disabled?: boolean;
  /**
   * `primary`: relleno azul, para la acción principal.
   * `ghost`: solo texto, para acciones secundarias.
   */
  variant?: 'primary' | 'ghost';
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          backgroundColor: isPrimary ? colors.primary : 'transparent',
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border,
          // Se atenúa al pulsar o cuando está desactivado.
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : colors.primary} />
      ) : (
        <Text
          style={[
            typography.body,
            styles.label,
            { color: isPrimary ? '#FFFFFF' : colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    fontFamily: fontFamilies.semibold,
  },
});
