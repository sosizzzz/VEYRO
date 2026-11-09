/**
 * Pantalla "Nueva contraseña".
 *
 * Se muestra cuando el usuario abre la app desde el enlace de recuperación
 * enviado por correo. Fija la nueva contraseña y vuelve al flujo normal.
 */
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
  resetPasswordSchema,
  translateAuthError,
  useAuth,
} from '@/modules/auth';
import { updatePassword } from '@/modules/auth/services/authService';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function NuevaContrasenaScreen() {
  const { colors, spacing, typography } = useTheme();
  const { clearPasswordRecovery, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setOk(null);

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(firstIssueMessage(validation.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(validation.data.password);
      setOk('Contraseña actualizada. Ya puedes usar la app.');
      clearPasswordRecovery();
    } catch (caught) {
      setError(translateAuthError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    clearPasswordRecovery();
    await signOut();
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
          <Text style={[typography.title, { color: colors.text }]}>Nueva contraseña</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Escribe tu nueva contraseña (mínimo 8 caracteres).
          </Text>

          <View style={{ marginTop: spacing.xl }}>
            {error ? <FormMessage tone="error">{error}</FormMessage> : null}
            {ok ? <FormMessage tone="success">{ok}</FormMessage> : null}

            <TextField
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <TextField
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite la contraseña"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <Button label="Guardar contraseña" onPress={handleSubmit} loading={isSubmitting} />
            <View style={{ marginTop: spacing.md }}>
              <Button label="Cancelar" variant="ghost" onPress={handleCancel} />
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
});
