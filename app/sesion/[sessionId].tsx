/**
 * Pantalla de entrenamiento (A-05).
 *
 * Flujo:
 * 1. Carga la sesión guardada en Supabase y crea el estado del motor.
 * 2. Pinta el ejercicio actual, sus series y el temporizador de descanso.
 * 3. Cada acción pasa por el motor (lógica pura) y, si es válida, se guarda.
 * 4. Al terminar, la sesión queda como `finalizada`; al cancelar, `cancelada`.
 *
 * La pantalla NO decide reglas: pregunta al motor. Así los tests del motor
 * sirven para toda la app.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  applyWorkoutEvent,
  canFinish,
  createWorkoutEngineState,
  ENGINE_ERROR_MESSAGES,
  getRestTimerRemaining,
  type WorkoutEngineState,
} from '@/domain/workout-engine';
import { useAuth } from '@/modules/auth';
import {
  cancelWorkoutSession,
  finishWorkoutSession,
  getWorkoutSessionDetail,
  saveSessionExerciseStatus,
  saveSessionSetResult,
  saveWorkoutSession,
} from '@/modules/workouts';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import {
  ExerciseProgress,
  RestTimer,
  SetRow,
  type SetRowResult,
} from '@/ui/components/session';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';
import type { SessionExerciseWithSets, SessionSet } from '@/types/workout';

/** Hora actual en ISO. Se usa en todos los eventos para poder testear. */
function nowIso(): string {
  return new Date().toISOString();
}

/** ¿Cambió algún dato visible de la serie? Sirve para no guardar de más. */
function setChanged(before: SessionSet, after: SessionSet): boolean {
  return (
    before.status !== after.status ||
    before.actual_weight !== after.actual_weight ||
    before.actual_reps !== after.actual_reps ||
    before.actual_time_seconds !== after.actual_time_seconds ||
    before.completed_at !== after.completed_at
  );
}

/**
 * Guarda en Supabase solo lo que cambió entre dos estados del motor.
 *
 * No hay transacción multi-tabla en el cliente, pero cada fila se actualiza
 * por separado y las operaciones son idempotentes: reintentar no duplica.
 */
async function persistChanges(
  before: WorkoutEngineState,
  after: WorkoutEngineState,
): Promise<void> {
  const tasks: Promise<void>[] = [saveWorkoutSession(after.session)];

  for (const exercise of after.exercises) {
    const previousExercise = before.exercises.find((item) => item.id === exercise.id);
    if (previousExercise && previousExercise.status !== exercise.status) {
      tasks.push(saveSessionExerciseStatus(exercise.id, exercise.status));
    }

    for (const set of exercise.sets) {
      const previousSet = previousExercise?.sets.find((item) => item.id === set.id);
      if (previousSet && setChanged(previousSet, set)) {
        tasks.push(saveSessionSetResult(set));
      }
    }
  }

  await Promise.all(tasks);
}

/** Texto legible del estado de un ejercicio. */
function exerciseStatusLabel(exercise: SessionExerciseWithSets): string {
  if (exercise.status === 'completado') return 'Completado';
  if (exercise.status === 'omitido') return 'Omitido';
  if (exercise.status === 'saltado') return 'Saltado (vuelve luego)';
  return 'Pendiente';
}

export default function EntrenamientoScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const [state, setState] = useState<WorkoutEngineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se actualiza cada segundo para que la cuenta atrás se repinte.
  const [now, setNow] = useState(nowIso());
  // Copia del estado para que el intervalo lea siempre el último valor.
  const stateRef = useRef<WorkoutEngineState | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        const detail = await getWorkoutSessionDetail(sessionId);
        if (cancelled) return;
        if (!detail) {
          setError('No se encontró la sesión.');
          return;
        }
        setState(createWorkoutEngineState(detail));
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la sesión.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Reloj del temporizador y detección de fin del descanso.
  //
  // Se hace dentro del `setInterval` (no en el cuerpo del efecto) para no
  // provocar renders en cascada. El intervalo lee el estado más reciente desde
  // `stateRef` y, si el descanso llegó a 0, pide al motor que lo detenga.
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      const currentTime = nowIso();
      setNow(currentTime);

      if (!current || current.session.rest_timer_state !== 'corriendo') return;
      if (getRestTimerRemaining(current, currentTime) > 0) return;

      const result = applyWorkoutEvent(current, {
        type: 'REST_TIMER_TICKED',
        now: currentTime,
      });
      if (!result.ok) return;

      setState(result.state);
      persistChanges(current, result.state).catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo guardar el descanso.');
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mantiene la copia al día después de cada cambio de estado.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const currentExercise = useMemo(() => {
    if (!state) return null;
    return state.exercises.find((exercise) => exercise.id === state.currentExerciseId) ?? null;
  }, [state]);

  const restRemaining = state ? getRestTimerRemaining(state, now) : 0;
  const finishAllowed = state ? canFinish(state) : false;

  /** Aplica un evento del motor y guarda los cambios. */
  async function runEvent(
    event: Parameters<typeof applyWorkoutEvent>[1],
  ): Promise<WorkoutEngineState | null> {
    if (!state || saving) return null;

    const result = applyWorkoutEvent(state, event);
    if (!result.ok) {
      setError(ENGINE_ERROR_MESSAGES[result.error]);
      return null;
    }

    setError(null);
    setState(result.state);

    try {
      await persistChanges(state, result.state);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se pudo guardar: ${cause.message}`
          : 'No se pudo guardar el progreso.',
      );
    }

    return result.state;
  }

  /** Completa una serie y, si quedan ejercicios, arranca el descanso. */
  async function handleCompleteSet(
    exerciseId: string,
    set: SessionSet,
    values: SetRowResult,
  ) {
    if (!state || saving) return;

    const completed = applyWorkoutEvent(state, {
      type: 'SET_COMPLETED',
      exerciseId,
      setId: set.id,
      actualWeight: values.actualWeight,
      actualReps: values.actualReps,
      actualTimeSeconds: values.actualTimeSeconds,
      completedAt: nowIso(),
    });

    if (!completed.ok) {
      setError(ENGINE_ERROR_MESSAGES[completed.error]);
      return;
    }

    // Después de una serie se descansa, salvo que ya no quede nada por hacer.
    let nextState = completed.state;
    const stillPending = nextState.exercises.some(
      (exercise) => exercise.status === 'pendiente' || exercise.status === 'saltado',
    );

    if (stillPending) {
      const restStarted = applyWorkoutEvent(nextState, {
        type: 'REST_TIMER_STARTED',
        startedAt: nowIso(),
      });
      if (restStarted.ok) nextState = restStarted.state;
    }

    setSaving(true);
    setError(null);
    setState(nextState);
    setNow(nowIso());

    try {
      await persistChanges(state, nextState);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se pudo guardar la serie: ${cause.message}`
          : 'No se pudo guardar la serie.',
      );
    } finally {
      setSaving(false);
    }
  }

  /** Cancela la sesión tras confirmarlo. No se borra: queda en el historial. */
  function handleCancel() {
    Alert.alert(
      'Cancelar entrenamiento',
      'La sesión quedará cancelada y no contará como entrenamiento. Esta acción no se puede deshacer.',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Cancelar sesión',
          style: 'destructive',
          onPress: async () => {
            if (!sessionId) return;
            setSaving(true);
            try {
              await cancelWorkoutSession(sessionId);
              router.replace('/(tabs)');
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'No se pudo cancelar.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  /** Finaliza la sesión cuando el motor lo permite. */
  function handleFinish() {
    if (!state || !sessionId) return;

    if (!canFinish(state)) {
      setError('Todavía quedan ejercicios pendientes o saltados.');
      return;
    }

    Alert.alert('Finalizar entrenamiento', '¿Guardar la sesión y volver al inicio?', [
      { text: 'Seguir entrenando', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: async () => {
          setSaving(true);
          setError(null);
          try {
            const finishedAt = nowIso();
            await finishWorkoutSession(sessionId, finishedAt);
            setState({
              ...state,
              currentExerciseId: null,
              session: { ...state.session, status: 'finalizada', finished_at: finishedAt },
            });
            router.replace('/(tabs)');
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : 'No se pudo finalizar la sesión.',
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen title="Entrenamiento" description="Cargando la sesión…">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (!state) {
    return (
      <Screen title="Entrenamiento" description="No se pudo abrir la sesión.">
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button label="Volver" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (state.session.status !== 'en_curso') {
    return (
      <Screen
        title="Entrenamiento"
        description={
          state.session.status === 'finalizada'
            ? 'Esta sesión ya está finalizada.'
            : 'Esta sesión está cancelada.'
        }
      >
        <Button label="Volver al inicio" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  return (
    <Screen title="Entrenamiento" description={`Sesión de ${user?.email ?? 'tu cuenta'}`}>
      <ScrollView
        style={{ flex: 1, marginTop: spacing.md }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <RestTimer
          remainingSeconds={restRemaining}
          state={state.session.rest_timer_state}
          disabled={saving}
          onStart={() => void runEvent({ type: 'REST_TIMER_STARTED', startedAt: nowIso() })}
          onPause={() => void runEvent({ type: 'REST_TIMER_PAUSED', at: nowIso() })}
          onResume={() => void runEvent({ type: 'REST_TIMER_RESUMED', at: nowIso() })}
          onStop={() => void runEvent({ type: 'REST_TIMER_STOPPED' })}
        />

        {/* Selector para cambiar de ejercicio sin perder el orden pendiente. */}
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.md }]}>
          Ejercicios
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          {state.exercises.map((exercise) => {
            const active = exercise.id === state.currentExerciseId;
            const available =
              exercise.status === 'pendiente' || exercise.status === 'saltado';

            return (
              <Pressable
                key={exercise.id}
                disabled={!available || saving}
                onPress={() =>
                  void runEvent({ type: 'EXERCISE_SELECTED', exerciseId: exercise.id })
                }
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderRadius: radius.pill,
                    opacity: available ? 1 : 0.45,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: active ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {exercise.exercise_name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {currentExercise ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.title, { color: colors.text }]}>
              {currentExercise.exercise_name}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              {currentExercise.primary_muscles.join(', ')} ·{' '}
              {exerciseStatusLabel(currentExercise)}
            </Text>

            <ExerciseProgress
              resolvedSets={
                currentExercise.sets.filter((set) => set.status !== 'pendiente').length
              }
              totalSets={currentExercise.sets.length}
            />

            {currentExercise.sets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                disabled={saving}
                onComplete={(values) =>
                  void handleCompleteSet(currentExercise.id, set, values)
                }
                onOmit={() =>
                  void runEvent({
                    type: 'SET_OMITTED',
                    exerciseId: currentExercise.id,
                    setId: set.id,
                  })
                }
              />
            ))}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Saltar ejercicio"
                  variant="ghost"
                  disabled={saving}
                  onPress={() =>
                    void runEvent({
                      type: 'EXERCISE_SKIPPED',
                      exerciseId: currentExercise.id,
                    })
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Omitir ejercicio"
                  variant="ghost"
                  disabled={saving}
                  onPress={() =>
                    Alert.alert(
                      'Omitir ejercicio',
                      'Se marcará como omitido en esta sesión. No volverá a aparecer.',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Omitir',
                          style: 'destructive',
                          onPress: () =>
                            void runEvent({
                              type: 'EXERCISE_OMITTED',
                              exerciseId: currentExercise.id,
                            }),
                        },
                      ],
                    )
                  }
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={[typography.subtitle, { color: colors.text }]}>
              No quedan ejercicios pendientes.
            </Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>
              Pulsa “Finalizar entrenamiento” para guardar la sesión.
            </Text>
          </View>
        )}

        <View style={{ marginTop: spacing.xl }}>
          <Button
            label="Finalizar entrenamiento"
            onPress={handleFinish}
            disabled={!finishAllowed || saving}
            loading={saving}
          />
          {!finishAllowed ? (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
              ]}
            >
              Resuelve los ejercicios pendientes o saltados para poder finalizar.
            </Text>
          ) : null}
        </View>

        <Pressable onPress={handleCancel} style={{ marginTop: spacing.lg, paddingVertical: 8 }}>
          <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>
            Cancelar entrenamiento
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
});
