/**
 * Pantalla de registro.
 *
 * Flujo:
 * 1. El usuario escribe nombre, correo y contraseña dos veces.
 * 2. Se validan los datos en local (Zod).
 * 3. Se crea la cuenta en Supabase.
 * 4. La base de datos crea el perfil automáticamente con un disparador.
 * 5. Si Supabase exige confirmar el correo, se avisa; si no, el layout raíz
 *    redirige solo a las pestañas.
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
  signUpSchema,
  translateAuthError,
  useAuth,
} from '@/modules/auth';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function RegistroScreen() {
  const { colors, spacing, typography } = useTheme();
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const validation = signUpSchema.safeParse({
      displayName,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      setError(firstIssueMessage(validation.error));
      return;
    }

    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      const result = await signUp({
        displayName: validation.data.displayName,
        email: validation.data.email,
        password: validation.data.password,
      });

      if (result.needsEmailConfirmation) {
        setInfo(
          'Cuenta creada. Te hemos enviado un correo: ábrelo y pulsa el enlace para activar tu cuenta.',
        );
      }
      // Si no hace falta confirmar, el layout raíz detecta la sesión y navega.
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { padding: spacing.lg }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[typography.title, { color: colors.text }]}>Crear cuenta</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Solo necesitas un nombre, un correo y una contraseña.
          </Text>

          <View style={{ marginTop: spacing.lg }}>
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}
            {info ? <FormMessage tone="success">{info}</FormMessage> : null}

            <TextField
              label="Nombre"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Cómo quieres que te llamemos"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />

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
              placeholder="Al menos 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />

            <TextField
              label="Repetir contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Vuelve a escribirla"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <Button label="Crear cuenta" onPress={handleSubmit} loading={isSubmitting} />

            <View style={[styles.footer, { marginTop: spacing.lg }]}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                ¿Ya tienes cuenta?{' '}
              </Text>
              <Link href="/inicio-sesion" style={styles.link}>
                <Text style={[typography.caption, { color: colors.primary }]}>Entrar</Text>
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
