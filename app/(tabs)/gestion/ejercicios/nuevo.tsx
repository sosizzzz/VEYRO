/**
 * Crear un ejercicio nuevo.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import {
  MUSCLE_GROUPS,
  createExercise,
  exerciseSchema,
  type ExerciseFormValues,
} from '@/modules/exercises';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function NuevoEjercicioScreen() {
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [values, setValues] = useState<ExerciseFormValues>({
    name: '',
    description: '',
    icon: '',
    primary_muscles: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ExerciseFormValues>(key: K, val: ExerciseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSave() {
    if (!ownerId) return;
    setError(null);
    const parsed = exerciseSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setSaving(true);
    try {
      await createExercise(ownerId, parsed.data);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Nuevo ejercicio" description="Añade un ejercicio a tu biblioteca.">
      <ScrollView style={{ flex: 1, marginTop: spacing.md }} keyboardShouldPersistTaps="handled">
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <TextField label="Nombre" value={values.name} onChangeText={(t) => set('name', t)} />
        <TextField
          label="Descripción (opcional)"
          value={values.description ?? ''}
          onChangeText={(t) => set('description', t)}
        />

        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
          Músculos principales (elige 1 a 3)
        </Text>
        {MUSCLE_GROUPS.map((group) => (
          <View key={group.divider} style={{ marginTop: spacing.sm }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{group.divider}</Text>
            <View style={styles.chips}>
              {group.muscles.map((m) => {
                const selected = values.primary_muscles.includes(m);
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setValues((v) => {
                        const has = v.primary_muscles.includes(m);
                        if (has) return { ...v, primary_muscles: v.primary_muscles.filter((x) => x !== m) };
                        if (v.primary_muscles.length >= 3) return v; // máximo 3
                        return { ...v, primary_muscles: [...v.primary_muscles, m] };
                      });
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: selected ? colors.background : colors.text },
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Button label="Guardar" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
