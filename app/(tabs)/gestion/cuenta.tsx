/**
 * Cuenta: datos del perfil y cierre de sesión.
 *
 * Antes esta información vivía dentro de Gestión. Ahora tiene su propia
 * pantalla para que las tarjetas de Gestión sean todas iguales y grandes.
 */
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { translateAuthError, useAuth } from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

export default function CuentaScreen() {
  const { profile, user, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (caught) {
      // Traduce el error técnico de Supabase a un mensaje entendible.
      setError(translateAuthError(caught));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Screen title="Cuenta" description="Tu perfil y la sesión actual.">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: spacing.lg,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 1 }]}>
            SESIÓN INICIADA COMO
          </Text>
          <Text style={[typography.title, { color: colors.text, marginTop: spacing.sm }]}>
            {profile?.display_name ?? 'Cargando perfil…'}
          </Text>
          {user?.email ? (
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>
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

        <Link href="/(tabs)/gestion" style={{ marginTop: spacing.lg, paddingVertical: 6 }}>
          <Text style={[typography.body, { color: colors.primary }]}>Volver a Gestión</Text>
        </Link>
      </ScrollView>
    </Screen>
  );
}
