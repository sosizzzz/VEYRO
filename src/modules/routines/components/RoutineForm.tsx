/**
 * Formulario de rutina, compartido por "Nueva rutina" y "Editar rutina".
 *
 * ¿Por qué un componente y no dos pantallas con el mismo código?
 * Porque antes había dos copias de esta lógica y cualquier cambio había que
 * hacerlo dos veces (y una se olvidaba). Aquí está una sola vez.
 *
 * La pantalla solo se encarga de cargar datos y guardar; este componente
 * se encarga de la interfaz y de la validación del formulario.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Exercise } from '@/modules/exercises';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { TextField } from '@/ui/components/TextField';
import { fontFamilies, useTheme } from '@/ui/theme';

import { routineDraftSchema, type RoutineDraftValues } from '../validation';

/** Días de la semana en orden ISO: 1 = lunes … 7 = domingo. */
const DAYS: { number: number; label: string }[] = [
  { number: 1, label: 'L' },
  { number: 2, label: 'M' },
  { number: 3, label: 'X' },
  { number: 4, label: 'J' },
  { number: 5, label: 'V' },
  { number: 6, label: 'S' },
  { number: 7, label: 'D' },
];

/** Los tres objetivos que se pueden activar en una serie. */
type TargetKey = 'weight' | 'reps' | 'time';

/**
 * Una serie tal y como se edita en pantalla.
 *
 * Los valores se guardan como TEXTO (no como número) porque el usuario
 * escribe y borra libremente. Se convierten a número solo al guardar.
 * `useX` indica si ese objetivo se tiene en cuenta o no.
 */
type FormSet = {
  weight: string;
  reps: string;
  time: string;
  useWeight: boolean;
  useReps: boolean;
  useTime: boolean;
};

/** Un ejercicio dentro del formulario (nombre incluido solo para mostrarlo). */
type FormExercise = {
  exerciseId: string;
  exerciseName?: string;
  sets: FormSet[];
};

/** Estado completo del formulario. */
type FormState = {
  name: string;
  description: string;
  weekdays: number[];
  exercises: FormExercise[];
};

type RoutineFormProps = {
  /** Datos con los que empieza el formulario (vacío al crear). */
  initialDraft: RoutineDraftValues;
  /** Ejercicios activos del usuario para el selector. */
  library: Exercise[];
  /** Mientras carga la biblioteca se muestra un indicador. */
  loadingLibrary?: boolean;
  /** Texto del botón principal ("Guardar rutina" o "Guardar cambios"). */
  submitLabel: string;
  /**
   * Guarda la rutina. Si lanza un error, el formulario lo muestra.
   * Ejemplo: `(values) => saveRoutine(ownerId, null, values)`.
   */
  onSubmit: (values: RoutineDraftValues) => Promise<void>;
  /** Contenido opcional debajo del botón (por ejemplo, "Archivar rutina"). */
  footer?: React.ReactNode;
};

/**
 * Convierte texto a número decimal.
 * Acepta coma (`80,5`) porque es lo habitual en español.
 * Devuelve `null` si el campo está vacío o no es un número válido.
 */
function decimalOrNull(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Igual que `decimalOrNull`, pero redondea a entero (repeticiones y segundos). */
function integerOrNull(text: string): number | null {
  const value = decimalOrNull(text);
  return value == null ? null : Math.round(value);
}

/** Convierte un número guardado en texto editable. */
function textFromNumber(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

/**
 * Crea una serie nueva.
 * Por defecto, peso y repeticiones activados (es lo más común) y tiempo apagado.
 */
function createSet(): FormSet {
  return {
    weight: '',
    reps: '',
    time: '',
    useWeight: true,
    useReps: true,
    useTime: false,
  };
}

/** Crea un ejercicio nuevo con 3 series, el valor habitual de partida. */
function createExercise(exercise: Exercise): FormExercise {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: [createSet(), createSet(), createSet()],
  };
}

/**
 * Pasa los datos guardados (snake_case, números) al modelo del formulario
 * (camelCase, texto). Las casillas se marcan solas si había un objetivo.
 */
function fromValues(values: RoutineDraftValues): FormState {
  return {
    name: values.name,
    description: values.description ?? '',
    weekdays: [...values.weekdays].sort((a, b) => a - b),
    exercises: values.exercises.map((exercise) => ({
      exerciseId: exercise.exercise_id,
      exerciseName: exercise.exercise_name,
      sets:
        exercise.sets.length > 0
          ? exercise.sets.map((set) => ({
              weight: textFromNumber(set.target_weight),
              reps: textFromNumber(set.target_reps),
              time: textFromNumber(set.target_time_seconds),
              useWeight: set.target_weight != null,
              useReps: set.target_reps != null,
              useTime: set.target_time_seconds != null,
            }))
          : [createSet()],
    })),
  };
}

/**
 * Pasa el formulario al formato que espera la base de datos.
 * Si una casilla está desmarcada, su valor se envía como `null`
 * (es decir: "este objetivo no se tiene en cuenta").
 */
function toValues(form: FormState): RoutineDraftValues {
  return {
    name: form.name,
    description: form.description,
    weekdays: [...form.weekdays].sort((a, b) => a - b),
    exercises: form.exercises.map((exercise, exerciseIndex) => ({
      exercise_id: exercise.exerciseId,
      exercise_name: exercise.exerciseName,
      sets: exercise.sets.map((set, setIndex) => ({
        // Las series se renumeran siempre 1, 2, 3… para que nunca haya huecos.
        set_number: setIndex + 1,
        target_weight: set.useWeight ? decimalOrNull(set.weight) : null,
        target_reps: set.useReps ? integerOrNull(set.reps) : null,
        target_time_seconds: set.useTime ? integerOrNull(set.time) : null,
      })),
    })),
  };
}

export function RoutineForm({
  initialDraft,
  library,
  loadingLibrary = false,
  submitLabel,
  onSubmit,
  footer,
}: RoutineFormProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // `useState` con función: el valor inicial se calcula una sola vez.
  const [form, setForm] = useState<FormState>(() => fromValues(initialDraft));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day].sort((a, b) => a - b),
    }));
  }

  function addExercise(exercise: Exercise) {
    setForm((current) => ({
      ...current,
      exercises: [...current.exercises, createExercise(exercise)],
    }));
    setPickerOpen(false);
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.exercises.length) return current;

      const exercises = [...current.exercises];
      [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
      return { ...current, exercises };
    });
  }

  function removeExercise(index: number) {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.filter((_, position) => position !== index),
    }));
  }

  /** Añade o quita series sin bajar de 1 ni pasar de 20. */
  function changeSetCount(exerciseIndex: number, delta: number) {
    setForm((current) => {
      const exercise = current.exercises[exerciseIndex];
      const nextCount = Math.max(1, Math.min(20, exercise.sets.length + delta));
      if (nextCount === exercise.sets.length) return current;

      const sets = [...exercise.sets];
      while (sets.length < nextCount) sets.push(createSet());
      if (sets.length > nextCount) sets.length = nextCount;

      const exercises = [...current.exercises];
      exercises[exerciseIndex] = { ...exercise, sets };
      return { ...current, exercises };
    });
  }

  /** Cambia un campo concreto de una serie. */
  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<FormSet>) {
    setForm((current) => {
      const exercise = current.exercises[exerciseIndex];
      const sets = exercise.sets.map((set, position) =>
        position === setIndex ? { ...set, ...patch } : set,
      );

      const exercises = [...current.exercises];
      exercises[exerciseIndex] = { ...exercise, sets };
      return { ...current, exercises };
    });
  }

  /**
   * Marca o desmarca un objetivo de una serie.
   * Al desmarcarlo se borra su texto para que no quede un valor "fantasma".
   */
  function toggleTarget(exerciseIndex: number, setIndex: number, target: TargetKey) {
    const set = form.exercises[exerciseIndex]?.sets[setIndex];
    if (!set) return;

    if (target === 'weight') {
      updateSet(exerciseIndex, setIndex, {
        useWeight: !set.useWeight,
        weight: set.useWeight ? '' : set.weight,
      });
    } else if (target === 'reps') {
      updateSet(exerciseIndex, setIndex, {
        useReps: !set.useReps,
        reps: set.useReps ? '' : set.reps,
      });
    } else {
      updateSet(exerciseIndex, setIndex, {
        useTime: !set.useTime,
        time: set.useTime ? '' : set.time,
      });
    }
  }

  async function handleSave() {
    setError(null);

    const parsed = routineDraftSchema.safeParse(toValues(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos de la rutina.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la rutina.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, marginTop: spacing.md }}
      keyboardShouldPersistTaps="handled"
      // Cerrar el teclado al arrastrar evita que tape los campos de abajo.
      keyboardDismissMode="on-drag"
    >
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <TextField
        label="Nombre"
        value={form.name}
        onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        placeholder="Por ejemplo: Full body lunes"
      />

      <TextField
        label="Descripción (opcional)"
        value={form.description}
        onChangeText={(description) => setForm((current) => ({ ...current, description }))}
        placeholder="Notas para ti"
      />

      <Text style={[typography.caption, styles.sectionTitle, { color: colors.textMuted }]}>
        Días planificados
      </Text>
      <View style={styles.chips}>
        {DAYS.map((day) => {
          const selected = form.weekdays.includes(day.number);
          return (
            <Pressable
              key={day.number}
              onPress={() => toggleDay(day.number)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Día ${day.label}`}
              style={[
                styles.chip,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text style={[typography.caption, { color: selected ? colors.background : colors.text }]}>
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[typography.caption, styles.sectionTitle, { color: colors.textMuted }]}>
        Ejercicios
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
        Marca solo lo que quieras controlar en cada serie. Lo que dejes sin marcar no se guarda.
      </Text>

      {form.exercises.length === 0 ? (
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
          Todavía no has añadido ningún ejercicio.
        </Text>
      ) : null}

      {form.exercises.map((exercise, exerciseIndex) => (
        <View
          key={`${exercise.exerciseId}-${exerciseIndex}`}
          style={[
            styles.card,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: spacing.md,
              marginTop: spacing.sm,
            },
          ]}
        >
          <Text style={[typography.body, { color: colors.text, fontFamily: fontFamilies.semibold }]}>
            {exerciseIndex + 1}. {exercise.exerciseName ?? 'Ejercicio'}
          </Text>

          <View style={styles.actions}>
            <Text
              onPress={() => moveExercise(exerciseIndex, -1)}
              accessibilityRole="button"
              style={[typography.caption, { color: colors.primary }]}
            >
              Subir
            </Text>
            <Text
              onPress={() => moveExercise(exerciseIndex, 1)}
              accessibilityRole="button"
              style={[typography.caption, { color: colors.primary }]}
            >
              Bajar
            </Text>
            <Text
              onPress={() => removeExercise(exerciseIndex)}
              accessibilityRole="button"
              style={[typography.caption, { color: colors.danger }]}
            >
              Quitar
            </Text>
          </View>

          {/* Contador de series con botones: más cómodo que escribir un número. */}
          <View style={styles.seriesRow}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Series</Text>
            <Pressable
              onPress={() => changeSetCount(exerciseIndex, -1)}
              accessibilityRole="button"
              accessibilityLabel="Quitar una serie"
              style={[styles.stepButton, { borderColor: colors.border }]}
            >
              <Text style={[typography.body, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[typography.body, { color: colors.text, minWidth: 24, textAlign: 'center' }]}>
              {exercise.sets.length}
            </Text>
            <Pressable
              onPress={() => changeSetCount(exerciseIndex, 1)}
              accessibilityRole="button"
              accessibilityLabel="Añadir una serie"
              style={[styles.stepButton, { borderColor: colors.border }]}
            >
              <Text style={[typography.body, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>

          {exercise.sets.map((set, setIndex) => (
            <View
              key={setIndex}
              style={[
                styles.setCard,
                { borderColor: colors.border, borderRadius: radius.sm ?? 8, marginTop: spacing.sm },
              ]}
            >
              <Text style={[typography.caption, { color: colors.textMuted, fontFamily: fontFamilies.semibold }]}>
                Serie {setIndex + 1}
              </Text>

              {/*
                Cada objetivo ocupa una fila completa (vertical).
                Antes iban los tres en una sola línea y los campos quedaban
                diminutos e incómodos de tocar.
              */}
              <TargetRow
                label="Peso"
                unit="kg"
                placeholder="Ej. 80"
                keyboardType="decimal-pad"
                enabled={set.useWeight}
                value={set.weight}
                onToggle={() => toggleTarget(exerciseIndex, setIndex, 'weight')}
                onChangeText={(weight) => updateSet(exerciseIndex, setIndex, { weight })}
              />
              <TargetRow
                label="Repeticiones"
                unit="reps"
                placeholder="Ej. 10"
                keyboardType="number-pad"
                enabled={set.useReps}
                value={set.reps}
                onToggle={() => toggleTarget(exerciseIndex, setIndex, 'reps')}
                onChangeText={(reps) => updateSet(exerciseIndex, setIndex, { reps })}
              />
              <TargetRow
                label="Tiempo"
                unit="seg"
                placeholder="Ej. 60"
                keyboardType="number-pad"
                enabled={set.useTime}
                value={set.time}
                onToggle={() => toggleTarget(exerciseIndex, setIndex, 'time')}
                onChangeText={(time) => updateSet(exerciseIndex, setIndex, { time })}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={{ marginTop: spacing.md }}>
        <Button
          label={pickerOpen ? 'Cerrar selector' : 'Añadir ejercicio'}
          variant="ghost"
          onPress={() => setPickerOpen((open) => !open)}
        />
      </View>

      {pickerOpen ? (
        <View
          style={[
            styles.card,
            {
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          {loadingLibrary ? (
            <ActivityIndicator color={colors.primary} />
          ) : library.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>
              No hay ejercicios activos. Crea uno en Gestión → Ejercicios.
            </Text>
          ) : (
            library.map((exercise) => (
              <Pressable
                key={exercise.id}
                onPress={() => addExercise(exercise)}
                style={{ paddingVertical: spacing.sm }}
                accessibilityRole="button"
                accessibilityLabel={`Añadir ${exercise.name}`}
              >
                <Text style={{ color: colors.text }}>{exercise.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {(exercise.primary_muscles ?? []).join(', ')}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button label={submitLabel} onPress={handleSave} loading={saving} />
      </View>

      {footer ? <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>{footer}</View> : null}
    </ScrollView>
  );
}

/**
 * Una fila de objetivo: casilla + nombre + (si está activa) campo numérico.
 *
 * La casilla decide si el objetivo cuenta. Si está apagada, el campo no se
 * muestra y al guardar se envía `null`.
 */
function TargetRow({
  label,
  unit,
  placeholder,
  keyboardType,
  enabled,
  value,
  onToggle,
  onChangeText,
}: {
  label: string;
  unit: string;
  placeholder: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  enabled: boolean;
  value: string;
  onToggle: () => void;
  onChangeText: (text: string) => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={styles.targetRow}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel={`Usar ${label}`}
        hitSlop={8}
        style={[
          styles.checkbox,
          {
            borderColor: enabled ? colors.primary : colors.border,
            backgroundColor: enabled ? colors.primary : 'transparent',
            borderRadius: 6,
          },
        ]}
      >
        {enabled ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>

      <Text style={[typography.body, styles.targetLabel, { color: enabled ? colors.text : colors.textMuted }]}>
        {label}
      </Text>

      {enabled ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          accessibilityLabel={`${label} en ${unit}`}
          style={[
            typography.body,
            styles.targetInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: radius.sm ?? 8,
              paddingHorizontal: spacing.sm,
            },
          ]}
        />
      ) : (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Sin objetivo</Text>
      )}

      <Text style={[typography.caption, { color: colors.textMuted, width: 30 }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 16,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  card: { borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  seriesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stepButton: {
    borderWidth: 1,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCard: { borderWidth: 1, padding: 10 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontFamily: fontFamilies.bold },
  targetLabel: { width: 96 },
  targetInput: { flex: 1, borderWidth: 1, minHeight: 40 },
});
