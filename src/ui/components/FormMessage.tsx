/**
 * Aviso de la pantalla: error, información o éxito.
 *
 * Se usa para mostrar el resultado de una acción sin interrumpir con ventanas
 * emergentes. El color transmite el tono y el texto dice qué ha pasado.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

type FormMessageProps = {
  /** Tono del aviso. */
  tone?: 'error' | 'info' | 'success';
  /** Texto del aviso. */
  children: string;
};

export function FormMessage({ tone = 'error', children }: FormMessageProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // Cada tono usa un color y un fondo suave derivado del tema.
  const toneColor =
    tone === 'error' ? colors.danger : tone === 'success' ? colors.success : colors.info;

  return (
    <View
      // `accessibilityLiveRegion` hace que el lector de pantalla anuncie el
      // aviso en cuanto aparece, sin que el usuario tenga que buscarlo.
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: `${toneColor}1A`, // 1A ≈ 10 % de opacidad
          borderColor: toneColor,
          borderRadius: radius.sm,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
      ]}
    >
      <Text style={[typography.caption, { color: toneColor }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
});
