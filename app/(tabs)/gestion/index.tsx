/**
 * Gestión: acceso a Rutinas y Ejercicios, y datos de la sesión.
 * (Rutinas se implementará en Fase 3; el acceso queda preparado).
 */
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { translateAuthError, useAuth } from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

function MenuRow({
  title,
  subtitle,
  href,
  disabled,
}: {
  title: string;
  subtitle: string;
  href?: string;
  disabled?: boolean;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[typography.subtitle, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
        {subtitle}
      </Text>
    </View>
  );

  if (disabled || !href) return <View style={{ marginTop: spacing.sm }}>{content}</View>;
  return (
    <Link href={href as any} asChild>
      <Pressable style={{ marginTop: spacing.sm }}>{content}</Pressable>
    </Link>
  );
}

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
    } catch (caught) {
      setError(translateAuthError(caught));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <Screen title="Gestión" description="Accede a tus rutinas y a tu biblioteca de ejercicios.">
      <View style={{ marginTop: spacing.lg }}>
        <MenuRow
          title="Rutinas"
          subtitle="Crea y planifica tus rutinas"
          href="/(tabs)/gestion/rutinas"
        />
        <MenuRow
          title="Ejercicios"
          subtitle="Catálogo por grupo muscular"
          href="/(tabs)/gestion/ejercicios"
        />
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginTop: spacing.xl,
          },
        ]}
      >
        <Text style={[typography.caption, { color: colors.textMuted }]}>SESIÓN INICIADA COMO</Text>
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
        <Button label="Cerrar sesión" variant="ghost" onPress={handleSignOut} loading={isSigningOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { borderWidth: 1 },
});
