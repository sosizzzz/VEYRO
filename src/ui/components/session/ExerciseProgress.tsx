/**
 * Progreso de un ejercicio (CT-06 / M-02).
 *
 * Muestra cuántas series se han resuelto y pinta una barra. Es solo visual:
 * los datos vienen del motor, no se calculan aquí.
 */
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/ui/theme';

type ExerciseProgressProps = {
  /** Series completadas u omitidas. */
  resolvedSets: number;
  /** Total de series del ejercicio. */
  totalSets: number;
};

export function ExerciseProgress({ resolvedSets, totalSets }: ExerciseProgressProps) {
  const { colors, spacing, radius, typography } = useTheme();

  // Evita dividir entre cero si un ejercicio llegara sin series.
  const ratio = totalSets > 0 ? Math.min(1, resolvedSets / totalSets) : 0;

  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={styles.row}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Progreso del ejercicio</Text>
        <Text style={[typography.caption, { color: colors.text }]}>
          {resolvedSets} de {totalSets} series
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: totalSets, now: resolvedSets }}
        style={[
          styles.track,
          { backgroundColor: colors.border, borderRadius: radius.pill, marginTop: 4 },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.success,
              borderRadius: radius.pill,
              width: `${ratio * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
