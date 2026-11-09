/**
 * Pantalla de inicio de sesión.
 *
 * Flujo:
 * 1. El usuario escribe correo y contraseña.
 * 2. Se validan los datos antes de llamar al servidor.
 * 3. Si son válidos, se pide a Supabase que inicie sesión.
 * 4. Al haber sesión, el layout raíz redirige automáticamente a las pestañas.
 *
 * La pantalla no navega "a mano" después de entrar: eso evita parpadeos y
 * rutas duplicadas.
 */
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  firstIssueMessage,
  signInSchema,
  translateAuthError,
  useAuth,
} from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function InicioSesionScreen() {
  const { colors, spacing, typography } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    // 1. Validación local: evita una llamada al servidor con datos incompletos.
    const validation = signInSchema.safeParse({ email, password });

    if (!validation.success) {
      setError(firstIssueMessage(validation.error));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // 2. Llamada al caso de uso. Si falla, lanza un error traducido abajo.
      await signIn(validation.data.email, validation.data.password);
      // 3. No se navega aquí: el layout raíz reacciona al cambio de sesión.
    } catch (caught) {
      setError(translateAuthError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        // En iOS el teclado tapa los campos si no se desplaza la vista.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.title, { color: colors.text }]}>Entrar</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Accede con tu correo y tu contraseña.
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}

            <TextField
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <Button label="Entrar" onPress={handleSubmit} loading={isSubmitting} />

            <View style={[styles.footer, { marginTop: spacing.lg }]}>
              <Link href="/olvidar-contrasena" style={styles.link}>
                <Text style={[typography.caption, { color: colors.primary }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Link>
            </View>

            <View style={[styles.footer, { marginTop: spacing.sm }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                ¿Todavía no tienes cuenta?{' '}
              </Text>
              <Link href="/registro" style={styles.link}>
                <Text style={[typography.caption, { color: colors.primary }]}>Crear una</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: { paddingVertical: 4 },
});
