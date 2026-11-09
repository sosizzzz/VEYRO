/**
 * Campo de texto con etiqueta.
 *
 * Se apoya en `TextInput` de React Native y añade lo que siempre falta:
 * una etiqueta encima, colores del tema y mensajes de accesibilidad.
 *
 * Cualquier propiedad válida de `TextInput` se puede pasar tal cual
 * (`keyboardType`, `autoComplete`, `onSubmitEditing`...).
 */
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> & {
  /** Texto que describe el campo. */
  label: string;
  /** Valor actual. */
  value: string;
  /** Se llama cada vez que el usuario escribe. */
  onChangeText: (text: string) => void;
};

export function TextField({ label, value, onChangeText, ...inputProps }: TextFieldProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.caption, styles.label, { color: colors.textMuted }]}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        // `accessibilityLabel` permite que el lector de pantalla anuncie
        // el nombre del campo aunque la etiqueta sea un texto aparte.
        accessibilityLabel={label}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
        ]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    minHeight: 52,
  },
});
