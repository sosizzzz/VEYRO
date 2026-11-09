/**
 * Pantalla "He olvidado mi contraseña".
 *
 * El usuario escribe su correo y Supabase envía un enlace para restablecer
 * la contraseña. La pantalla muestra un aviso claro y permite volver al login.
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
  forgotPasswordSchema,
  translateAuthError,
} from '@/modules/auth';
import { resetPasswordWithEmail } from '@/modules/auth/services/authService';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function OlvidarContrasenaScreen() {
  const { colors, spacing, typography } = useTheme();

  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setOk(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(firstIssueMessage(validation.error));
      return;
    }

    setEnviando(true);
    try {
      await resetPasswordWithEmail(validation.data.email);
      setOk(
        'Se ha enviado un enlace de restablecimiento a tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).',
      );
    } catch (caught) {
      setError(translateAuthError(caught));
    } finally {
      setEnviando(false);
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
          <Text style={[typography.title, { color: colors.text }]}>
            Recuperar contraseña
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}
            {ok ? <FormMessage tone="success">{ok}</FormMessage> : null}

            <TextField
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <Button
              label="Enviar enlace de recuperación"
              onPress={handleSubmit}
              loading={enviando}
            />

            <View style={[styles.footer, { marginTop: spacing.lg }]}>
              <Link href="/inicio-sesion" style={styles.link}>
                <Text style={[typography.caption, { color: colors.primary }]}>
                  Volver a iniciar sesión
                </Text>
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
