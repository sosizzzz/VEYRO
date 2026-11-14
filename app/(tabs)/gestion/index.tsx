/**
 * Gestión: acceso a Rutinas, Ejercicios, Ajustes y Cuenta.
 *
 * Todas las acciones son tarjetas grandes con ilustración para que se puedan
 * pulsar cómodamente con el pulgar. La tarjeta de Cuenta muestra el nombre y
 * el correo de la sesión actual; los detalles y el cierre de sesión están en
 * su propia pantalla.
 */
import { useRouter } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { useAuth } from '@/modules/auth';
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
              // El correo puede ser largo: una sola línea evita que la tarjeta
              // crezca y rompa la altura común de todas.
              numberOfLines={1}
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

export default function GestionScreen() {
  const { profile, user } = useAuth();
  const { spacing } = useTheme();

  // En la tarjeta de cuenta se ve de un vistazo quién ha iniciado sesión.
  const nombreVisible = profile?.display_name ?? 'Cargando perfil…';
  const cuentaSubtitle = user?.email ? `${nombreVisible} · ${user.email}` : nombreVisible;

  return (
    <Screen
      title="Gestión"
      description="Accede a tus rutinas, ejercicios y preferencias."
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
            image={require('../../../assets/images/card-rutinas.png')}
            href="/(tabs)/gestion/rutinas"
          />
          <MenuCard
            title="Ejercicios"
            subtitle="Tu catálogo por grupo muscular"
            image={require('../../../assets/images/card-ejercicios.png')}
            href="/(tabs)/gestion/ejercicios"
          />
          <MenuCard
            title="Ajustes"
            subtitle="Preferencias de la aplicación"
            image={require('../../../assets/images/card-ajustes.png')}
            href="/(tabs)/gestion/ajustes"
          />
          <MenuCard
            title="Cuenta"
            subtitle={cuentaSubtitle}
            image={require('../../../assets/images/card-cuenta.png')}
            href="/(tabs)/gestion/cuenta"
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
});
