/**
 * Gestión: acceso a Rutinas y Ejercicios, ajustes y datos de la sesión.
 *
 * Las dos acciones principales son tarjetas grandes con ilustración para que
 * se puedan pulsar cómodamente con el pulgar. El resto de la pantalla mantiene
 * información de la cuenta y el cierre de sesión.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { translateAuthError, useAuth } from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

/**
 * Tarjeta grande de acceso.
 *
 * `image` se carga con `require` y no con una URL: así la ilustración viaja
 * dentro de la app y funciona sin conexión.
 */
function MenuCard({
  title,
  subtitle,
  image,
  href,
}: {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  href: string;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [
        styles.cardPressable,
        { marginTop: spacing.md, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <ImageBackground
        source={image}
        resizeMode="cover"
        // `imageStyle` redondea solo la imagen; el contenido se recorta igual
        // gracias a `overflow: 'hidden'` del contenedor.
        imageStyle={{ borderRadius: radius.lg }}
        style={[styles.cardImage, { borderRadius: radius.lg }]}
      >
        <View style={[styles.cardOverlay, { borderRadius: radius.lg, padding: spacing.lg }]}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={[typography.title, { color: '#FFFFFF' }]}>{title}</Text>
            <Text
              style={[
                typography.body,
                { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
              ]}
            >
              {subtitle}
            </Text>
          </View>

          {/* La flecha indica que la tarjeta se puede abrir. */}
          <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

/** Fila compacta para acciones secundarias (por ejemplo, Ajustes). */
function MenuRow({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          marginTop: spacing.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.subtitle, { color: colors.text }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={[typography.subtitle, { color: colors.textMuted }]}>›</Text>
    </Pressable>
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
    <Screen
      title="Gestión"
      description="Accede a tus rutinas y a tu biblioteca de ejercicios."
    >
      {/* En pantallas pequeñas el contenido no cabe entero: se puede deslizar. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: spacing.lg }}>
          <MenuCard
            title="Rutinas"
            subtitle="Crea y planifica tus entrenamientos"
            image={require('../../../../assets/images/card-rutinas.png')}
            href="/(tabs)/gestion/rutinas"
          />
          <MenuCard
            title="Ejercicios"
            subtitle="Tu catálogo por grupo muscular"
            image={require('../../../../assets/images/card-ejercicios.png')}
            href="/(tabs)/gestion/ejercicios"
          />
        </View>

        {/* Ajustes queda justo encima del bloque de la cuenta. */}
        <MenuRow
          title="Ajustes"
          subtitle="Preferencias de la aplicación"
          href="/(tabs)/gestion/ajustes"
        />

        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginTop: spacing.md,
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardPressable: {
    // `overflow: 'hidden'` recorta la imagen para que respete las esquinas.
    overflow: 'hidden',
  },
  cardImage: {
    height: 156,
    justifyContent: 'flex-end',
  },
  cardOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    // Oscurece la ilustración lo justo para que el texto blanco se lea bien.
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
  },
  chevron: {
    fontSize: 34,
    lineHeight: 34,
  },
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountCard: {
    borderWidth: 1,
  },
});
