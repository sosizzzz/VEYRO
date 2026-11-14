/**
 * Temporizador de descanso visual (CT-06 / M-02).
 *
 * No guarda tiempo por su cuenta: recibe los segundos que quedan y avisa al
 * padre con callbacks. Así la lógica sigue en el motor (A-03) y este
 * componente solo pinta y recoge pulsaciones.
 *
 * Contrato (lo usa A-05):
 * ```tsx
 * <RestTimer
 *   remainingSeconds={45}
 *   state="corriendo"
 *   onStart={...} onPause={...} onResume={...} onStop={...}
 * />
 * ```
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RestTimerState } from '@/types/workout';
import { useTheme } from '@/ui/theme';

type RestTimerProps = {
  /** Segundos que faltan, ya calculados por el motor. */
  remainingSeconds: number;
  /** `detenido`, `corriendo` o `pausado`. */
  state: RestTimerState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** Bloquea los botones mientras se guarda o si la sesión no está en curso. */
  disabled?: boolean;
};

/** Convierte 65 en “01:05”. */
function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RestTimer({
  remainingSeconds,
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: RestTimerProps) {
  const { colors, spacing, radius, typography } = useTheme();

  const statusLabel =
    state === 'corriendo'
      ? 'Descansando'
      : state === 'pausado'
        ? 'En pausa'
        : remainingSeconds === 0
          ? 'Descanso terminado'
          : 'Descanso listo';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.row}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{statusLabel}</Text>
          <Text style={[typography.title, { color: colors.text }]}>
            {formatSeconds(remainingSeconds)}
          </Text>
        </View>

        <View style={styles.buttons}>
          {state === 'detenido' ? (
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              onPress={onStart}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.sm,
                  opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[typography.caption, { color: '#FFFFFF' }]}>Iniciar</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={state === 'corriendo' ? onPause : onResume}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.sm,
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: '#FFFFFF' }]}>
                  {state === 'corriendo' ? 'Pausar' : 'Reanudar'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onStop}
                style={({ pressed }) => [
                  styles.button,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.sm,
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.text }]}>Detener</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
});
