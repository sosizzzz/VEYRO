/**
 * Fila de una serie dentro de la pantalla de entrenamiento (CT-06 / M-02).
 *
 * Muestra el objetivo copiado de la rutina y deja escribir el resultado real.
 * Los campos se apilan en vertical: en un móvil, tres campos en horizontal
 * quedan demasiado estrechos y se escriben mal.
 *
 * Contrato (lo usa A-05):
 * ```tsx
 * <SetRow
 *   set={serie}
 *   index={0}
 *   onComplete={(valores) => ...}
 *   onOmit={() => ...}
 * />
 * ```
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SessionSet } from '@/types/workout';
import { useTheme } from '@/ui/theme';

export type SetRowResult = {
  actualWeight: number | null;
  actualReps: number | null;
  actualTimeSeconds: number | null;
};

type SetRowProps = {
  /** Serie que se pinta. */
  set: SessionSet;
  /** Posición dentro del ejercicio (0 = primera). */
  index: number;
  /** Se llama al pulsar “Completar” con los valores escritos. */
  onComplete: (result: SetRowResult) => void;
  /** Se llama al pulsar “Omitir”. */
  onOmit: () => void;
  /** Bloquea las acciones mientras se guarda o si la sesión no está en curso. */
  disabled?: boolean;
};

/** Convierte texto en número. Acepta coma decimal y devuelve null si está vacío. */
function parseNumber(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!clean) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

/** Texto corto del objetivo: “60 kg × 10”, “45 s” o “Sin objetivo”. */
function formatTarget(set: SessionSet): string {
  const parts: string[] = [];
  if (set.target_weight != null) parts.push(`${set.target_weight} kg`);
  if (set.target_reps != null) parts.push(`${set.target_reps} reps`);
  if (set.target_time_seconds != null) parts.push(`${set.target_time_seconds} s`);
  return parts.length > 0 ? `Objetivo: ${parts.join(' · ')}` : 'Sin objetivo';
}

/** Campo de texto con etiqueta, usado para peso, reps y tiempo. */
function NumberField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  editable,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  keyboardType: 'decimal-pad' | 'number-pad';
  editable: boolean;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        editable={editable}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.background,
            padding: spacing.sm,
            marginTop: 4,
          },
        ]}
      />
    </View>
  );
}

export function SetRow({ set, index, onComplete, onOmit, disabled = false }: SetRowProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // Los campos empiezan con el objetivo para que, si se cumple, solo haya que
  // pulsar “Completar”. El usuario puede cambiarlos antes de guardar.
  const [weight, setWeight] = useState(
    set.actual_weight != null
      ? String(set.actual_weight)
      : set.target_weight != null
        ? String(set.target_weight)
        : '',
  );
  const [reps, setReps] = useState(
    set.actual_reps != null
      ? String(set.actual_reps)
      : set.target_reps != null
        ? String(set.target_reps)
        : '',
  );
  const [time, setTime] = useState(
    set.actual_time_seconds != null
      ? String(set.actual_time_seconds)
      : set.target_time_seconds != null
        ? String(set.target_time_seconds)
        : '',
  );

  const isCompleted = set.status === 'completada';
  const isOmitted = set.status === 'omitida';
  const isPending = set.status === 'pendiente';

  // Si la serie no tenía objetivos (datos antiguos), se ofrecen peso y reps
  // para que se pueda registrar algo. Si tenía objetivos, solo esos campos.
  const hasAnyTarget =
    set.target_weight != null || set.target_reps != null || set.target_time_seconds != null;
  const showWeight = !hasAnyTarget || set.target_weight != null;
  const showReps = !hasAnyTarget || set.target_reps != null;
  const showTime = set.target_time_seconds != null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isCompleted ? colors.success : colors.border,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginTop: spacing.sm,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isCompleted ? colors.success : colors.background,
              borderColor: isCompleted ? colors.success : colors.border,
            },
          ]}
        >
          <Text style={[typography.caption, { color: isCompleted ? '#FFFFFF' : colors.text }]}>
            {index + 1}
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
          {formatTarget(set)}
        </Text>
        {isCompleted ? (
          <Text style={[typography.caption, { color: colors.success }]}>Hecha ✓</Text>
        ) : isOmitted ? (
          <Text style={[typography.caption, { color: colors.danger }]}>Omitida</Text>
        ) : null}
      </View>

      {isPending ? (
        <>
          {showWeight ? (
            <NumberField
              label="Peso real (kg)"
              value={weight}
              onChange={setWeight}
              placeholder={set.target_weight != null ? String(set.target_weight) : '0'}
              keyboardType="decimal-pad"
              editable={!disabled}
            />
          ) : null}
          {showReps ? (
            <NumberField
              label="Repeticiones reales"
              value={reps}
              onChange={setReps}
              placeholder={set.target_reps != null ? String(set.target_reps) : '0'}
              keyboardType="number-pad"
              editable={!disabled}
            />
          ) : null}
          {showTime ? (
            <NumberField
              label="Tiempo real (segundos)"
              value={time}
              onChange={setTime}
              placeholder={set.target_time_seconds != null ? String(set.target_time_seconds) : '0'}
              keyboardType="number-pad"
              editable={!disabled}
            />
          ) : null}

          <View style={[styles.actions, { marginTop: spacing.md }]}>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={() =>
                onComplete({
                  actualWeight: parseNumber(weight),
                  actualReps: parseNumber(reps),
                  actualTimeSeconds: parseNumber(time),
                })
              }
              style={({ pressed }) => [
                styles.completeButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.sm,
                  opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Text style={[typography.body, { color: '#FFFFFF' }]}>Completar serie</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={onOmit}
              style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.sm }}
            >
              <Text style={[typography.caption, { color: colors.textMuted }]}>Omitir</Text>
            </Pressable>
          </View>
        </>
      ) : (
        // Serie ya resuelta: se muestra el resultado guardado, sin campos.
        <Text style={[typography.body, { color: colors.text, marginTop: spacing.sm }]}>
          {[
            set.actual_weight != null ? `${set.actual_weight} kg` : null,
            set.actual_reps != null ? `${set.actual_reps} reps` : null,
            set.actual_time_seconds != null ? `${set.actual_time_seconds} s` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Sin datos registrados'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 8, fontSize: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completeButton: { flex: 1, alignItems: 'center' },
});
