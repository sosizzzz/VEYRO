/**
 * Pantalla que se muestra cuando una ruta no existe.
 *
 * En desarrollo casi siempre significa una ruta mal escrita en un `Link`
 * o en un `router.push`.
 */
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/ui/theme';

export default function NotFoundScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Ruta no encontrada' }} />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.subtitle, { color: colors.text }]}>
          Esta pantalla no existe
        </Text>

        <Link href="/" style={{ marginTop: spacing.lg }}>
          <Text style={[typography.body, { color: colors.primary }]}>
            Volver al inicio
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
