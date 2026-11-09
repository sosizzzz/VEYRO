/**
 * Pantalla de carga.
 *
 * Se muestra mientras la app comprueba si hay una sesión guardada.
 * Sin esto, al abrir la app se vería un parpadeo del login aunque el usuario
 * ya estuviera dentro.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme';

type LoadingScreenProps = {
  /** Texto opcional bajo el indicador. */
  message?: string;
};

export function LoadingScreen({ message = 'Cargando…' }: LoadingScreenProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
