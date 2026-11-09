/**
 * Editar / archivar un ejercicio.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import {
  MUSCLE_GROUPS,
  archiveExercise,
  exerciseSchema,
  getExerciseById,
  restoreExercise,
  updateExercise,
  type ExerciseFormValues,
} from '@/modules/exercises';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

export default function EditarEjercicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState<ExerciseFormValues>({
    name: '',
    description: '',
    icon: '',
    primary_muscles: [],
  });
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ExerciseFormValues>(key: K, val: ExerciseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ex = await getExerciseById(id);
        if (!ex) {
          setError('Ejercicio no encontrado.');
          return;
        }
        setValues({
          name: ex.name,
          description: ex.description ?? '',
          icon: ex.icon ?? '',
          primary_muscles: ex.primary_muscles ?? [],
        });
        setArchived(!!ex.archived_at);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSave() {
    if (!id) return;
    setError(null);
    const parsed = exerciseSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setSaving(true);
    try {
      await updateExercise(id, parsed.data);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!id) return;
    if (!archived) {
      Alert.alert('Archivar ejercicio', 'Desaparecerá del listado general, pero se conservará en el historial.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveExercise(id);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo archivar.');
            }
          },
        },
      ]);
    } else {
      try {
        await restoreExercise(id);
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo recuperar.');
      }
    }
  }

  if (loading) {
    return (
      <Screen title="Ejercicio" description="Cargando…">
        <Text style={{ color: colors.textMuted, marginTop: 16 }}>Cargando…</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Editar ejercicio" description="Modifica los datos o archiva el ejercicio.">
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
                        if (v.primary_muscles.length >= 3) return v;
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

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Guardar cambios" onPress={handleSave} loading={saving} />
        </View>
        <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          <Button
            label={archived ? 'Recuperar ejercicio' : 'Archivar ejercicio'}
            variant="ghost"
            onPress={handleArchiveToggle}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
