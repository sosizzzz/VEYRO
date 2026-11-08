/**
 * `Screen` = envoltorio común de todas las pantallas.
 *
 * ¿Por qué existe? Para que ninguna pantalla repita el fondo, los márgenes
 * y el área segura (la zona que no tapa la muesca o la barra del sistema).
 * Si mañana cambia el fondo, se cambia aquí y en ningún otro sitio.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

type ScreenProps = {
  /** Título grande de la pantalla. */
  title: string;
  /** Texto de apoyo opcional, debajo del título. */
  description?: string;
  /** Contenido de la pantalla. */
  children?: ReactNode;
};

export function Screen({ title, description, children }: ScreenProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView
      // `edges={['top']}`: respeta la muesca superior,
      // pero deja que el fondo llegue hasta abajo (donde está el menú).
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={[styles.content, { padding: spacing.lg }]}>
        <Text style={[typography.title, { color: colors.text }]}>{title}</Text>

        {description ? (
          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.sm },
            ]}
          >
            {description}
          </Text>
        ) : null}

        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
