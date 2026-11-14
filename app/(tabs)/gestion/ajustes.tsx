/**
 * Ajustes: pantalla de preferencias.
 *
 * De momento es un marcador de posición. Existe ya para que el acceso desde
 * Gestión tenga destino y para acordar dónde irán las opciones cuando se
 * aprueben (tema, unidades de peso, avisos…).
 */
import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

export default function AjustesScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <Screen title="Ajustes" description="Preferencias de la aplicación.">
      <View style={{ marginTop: spacing.lg }}>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Todavía no hay opciones disponibles. Esta pantalla se irá completando en las
          siguientes fases.
        </Text>

        <Link href="/(tabs)/gestion" style={{ marginTop: spacing.lg, paddingVertical: 6 }}>
          <Text style={[typography.body, { color: colors.primary }]}>Volver a Gestión</Text>
        </Link>
      </View>
    </Screen>
  );
}
