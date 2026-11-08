/**
 * Gestión (pantalla "Gestión").
 *
 * Aquí vivirán los dos accesos principales: Rutinas y Ejercicios.
 * De momento (fase 1A) muestra quién ha iniciado sesión y permite salir,
 * que es lo mínimo para poder probar el acceso de principio a fin.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { translateAuthError, useAuth } from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

export default function GestionScreen() {
  const { profile, user, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const nombreVisible = profile?.display_name ?? 'Cargando perfil…';

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
      // El layout de pestañas detecta que no hay sesión y redirige al acceso.
    } catch (caught) {
      setError(translateAuthError(caught));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Screen
      title="Gestión"
      description="Desde aquí crearás y editarás tus rutinas y ejercicios."
    >
      {/* Tarjeta con los datos de la sesión actual. */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginTop: spacing.lg,
          },
        ]}
      >
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          SESIÓN INICIADA COMO
        </Text>

        <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.xs }]}>
          {nombreVisible}
        </Text>

        {user?.email ? (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
            {user.email}
          </Text>
        ) : null}
      </View>

      <View style={{ marginTop: spacing.lg }}>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <Button
          label="Cerrar sesión"
          variant="ghost"
          onPress={handleSignOut}
          loading={isSigningOut}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
});
