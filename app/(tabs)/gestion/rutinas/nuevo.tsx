/**
 * Crear rutina (MVP): nombre, descripción, días, ejercicios con series/objetivos.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/modules/auth';
import { listActiveExercises, type Exercise } from '@/modules/exercises';
import {
  routineDraftSchema,
  saveRoutine,
  type RoutineDraftValues,
  type RoutineExerciseDraft,
} from '@/modules/routines';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { TextField } from '@/ui/components/TextField';
import { useTheme } from '@/ui/theme';

const DAYS: { n: number; label: string }[] = [
  { n: 1, label: 'L' }, { n: 2, label: 'M' }, { n: 3, label: 'X' },
  { n: 4, label: 'J' }, { n: 5, label: 'V' }, { n: 6, label: 'S' }, { n: 7, label: 'D' },
];

function numOrNull(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function NuevaRutinaScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loadingLib, setLoadingLib] = useState(true);
  const [draft, setDraft] = useState<RoutineDraftValues>({
    name: '',
    description: '',
    weekdays: [],
    exercises: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      try {
        setLibrary(await listActiveExercises(ownerId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la biblioteca.');
      } finally {
        setLoadingLib(false);
      }
    })();
  }, [ownerId]);

  function toggleDay(n: number) {
    setDraft((d) => ({
      ...d,
      weekdays: d.weekdays.includes(n) ? d.weekdays.filter((x) => x !== n) : [...d.weekdays, n].sort((a, b) => a - b),
    }));
  }

  function addExercise(ex: Exercise) {
    setDraft((d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        {
          exercise_id: ex.id,
          exercise_name: ex.name,
          sets: [
            { set_number: 1, target_weight: null, target_reps: null, target_time_seconds: null },
            { set_number: 2, target_weight: null, target_reps: null, target_time_seconds: null },
            { set_number: 3, target_weight: null, target_reps: null, target_time_seconds: null },
          ],
        },
      ],
    }));
    setPickerOpen(false);
  }

  function moveExercise(idx: number, dir: -1 | 1) {
    setDraft((d) => {
      const arr = [...d.exercises];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, exercises: arr };
    });
  }

  function removeExercise(idx: number) {
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));
  }

  function setSetCount(idx: number, count: number) {
    const n = Math.max(1, Math.min(20, Math.floor(count) || 1));
    setDraft((d) => {
      const arr = [...d.exercises];
      const ex = { ...arr[idx], sets: [...arr[idx].sets] };
      while (ex.sets.length < n) ex.sets.push({ set_number: ex.sets.length + 1, target_weight: null, target_reps: null, target_time_seconds: null });
      if (ex.sets.length > n) ex.sets = ex.sets.slice(0, n);
      ex.sets = ex.sets.map((s, i) => ({ ...s, set_number: i + 1 }));
      arr[idx] = ex;
      return { ...d, exercises: arr };
    });
  }

  function setTarget(idx: number, setIdx: number, field: 'target_weight' | 'target_reps' | 'target_time_seconds', raw: string) {
    setDraft((d) => {
      const arr = [...d.exercises];
      const ex = { ...arr[idx], sets: arr[idx].sets.map((s) => ({ ...s })) };
      const val = numOrNull(raw);
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: field === 'target_weight' ? val : (val == null ? null : Math.round(val)) };
      arr[idx] = ex;
      return { ...d, exercises: arr };
    });
  }

  async function handleSave() {
    if (!ownerId) return;
    setError(null);
    const parsed = routineDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');
      return;
    }
    setSaving(true);
    try {
      await saveRoutine(ownerId, null, parsed.data);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Nueva rutina" description="Define ejercicios, objetivos y días.">
      <ScrollView style={{ flex: 1, marginTop: spacing.md }} keyboardShouldPersistTaps="handled">
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <TextField label="Nombre" value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} />
        <TextField label="Descripción (opcional)" value={draft.description ?? ''} onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))} />

        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>Días planificados</Text>
        <View style={styles.chips}>
          {DAYS.map((d) => {
            const sel = draft.weekdays.includes(d.n);
            return (
              <Pressable key={d.n} onPress={() => toggleDay(d.n)} style={[styles.chip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary : colors.surface }]}>
                <Text style={[typography.caption, { color: sel ? colors.background : colors.text }]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.lg }]}>Ejercicios</Text>
        {draft.exercises.map((ex, idx) => (
          <View key={`${ex.exercise_id}-${idx}`} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm }]}>
            <Text style={[typography.body, { color: colors.text }]}>{idx + 1}. {ex.exercise_name ?? ex.exercise_id}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Pressable onPress={() => moveExercise(idx, -1)}><Text style={{ color: colors.primary }}>Subir</Text></Pressable>
              <Pressable onPress={() => moveExercise(idx, 1)}><Text style={{ color: colors.primary }}>Bajar</Text></Pressable>
              <Pressable onPress={() => removeExercise(idx)}><Text style={{ color: colors.danger }}>Quitar</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>Series: </Text>
              <TextInput
                value={String(ex.sets.length)}
                onChangeText={(t) => setSetCount(idx, Number(t))}
                keyboardType="number-pad"
                style={[styles.smallInput, { borderColor: colors.border, color: colors.text }]}
              />
            </View>
            {ex.sets.map((s, si) => (
              <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={[typography.caption, { color: colors.textMuted, width: 20 }]}>{s.set_number}</Text>
                <TextInput placeholder="kg" placeholderTextColor={colors.textMuted} defaultValue={s.target_weight != null ? String(s.target_weight) : ''} onChangeText={(t) => setTarget(idx, si, 'target_weight', t)} keyboardType="decimal-pad" style={[styles.smallInput, { borderColor: colors.border, color: colors.text, flex: 1 }]} />
                <TextInput placeholder="reps" placeholderTextColor={colors.textMuted} defaultValue={s.target_reps != null ? String(s.target_reps) : ''} onChangeText={(t) => setTarget(idx, si, 'target_reps', t)} keyboardType="number-pad" style={[styles.smallInput, { borderColor: colors.border, color: colors.text, flex: 1 }]} />
                <TextInput placeholder="seg" placeholderTextColor={colors.textMuted} defaultValue={s.target_time_seconds != null ? String(s.target_time_seconds) : ''} onChangeText={(t) => setTarget(idx, si, 'target_time_seconds', t)} keyboardType="number-pad" style={[styles.smallInput, { borderColor: colors.border, color: colors.text, flex: 1 }]} />
              </View>
            ))}
          </View>
        ))}

        <View style={{ marginTop: spacing.sm }}>
          <Button label={pickerOpen ? 'Cerrar selector' : 'Añadir ejercicio'} variant="ghost" onPress={() => setPickerOpen((v) => !v)} />
        </View>
        {pickerOpen ? (
          <View style={[styles.card, { borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.xs }]}>
            {loadingLib ? <ActivityIndicator color={colors.primary} /> : library.length === 0 ? (
              <Text style={{ color: colors.textMuted }}>No hay ejercicios activos. Crea uno en Gestión → Ejercicios.</Text>
            ) : (
              library.map((ex) => (
                <Pressable key={ex.id} onPress={() => addExercise(ex)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: colors.text }}>{ex.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{(ex.primary_muscles ?? []).join(', ')}</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
          <Button label="Guardar rutina" onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  card: { borderWidth: 1 },
  smallInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 48 },
});
