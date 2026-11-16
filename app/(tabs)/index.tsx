/**
 * Inicio.
 *
 * En esta fase muestra el entrenamiento que se quedó abierto. Es lo primero
 * que necesita ver una persona al volver a la app: “tienes una sesión a
 * medias, ¿continuar?”.
 *
 * Las rutinas del día llegarán en la fase de planificación (M-05).
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { clearLocalSession, loadActiveLocalSession, saveLocalSession } from '@/data/local';
import { useAuth } from '@/modules/auth';
import {
  cancelWorkoutSession,
  getActiveWorkoutSession,
  type WorkoutSessionDetail,
} from '@/modules/workouts';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

/** Hora local legible, por ejemplo “20:35”. */
function startTimeLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InicioScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();

  const ownerId = user?.id;
  const [activeSession, setActiveSession] = useState<WorkoutSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      // 1) Copia local: es la más reciente si había cambios sin sincronizar.
      const local = await loadActiveLocalSession(ownerId);
      if (local) {
        setActiveSession(local);
        return;
      }

      // 2) Si no hay copia local, se pregunta a Supabase.
      const remote = await getActiveWorkoutSession(ownerId);
      setActiveSession(remote);

      if (remote) {
        // Se guarda para poder reanudar incluso sin conexión.
        await saveLocalSession(remote).catch(() => {
          // La sesión sigue accesible desde la nube.
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo comprobar la sesión.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  // `useFocusEffect` recarga al volver a Inicio (por ejemplo, tras finalizar).
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  function handleCancel() {
    if (!activeSession) return;

    Alert.alert(
      'Cancelar entrenamiento',
      'La sesión quedará cancelada y no contará como entrenamiento. Esta acción no se puede deshacer.',
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Cancelar sesión',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            setError(null);
            try {
              // Primero la nube; solo si confirma se borra la copia local.
              await cancelWorkoutSession(activeSession.id);
              await clearLocalSession(activeSession.id).catch(() => {
                // La sesión remota ya está cancelada.
              });
              await load();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'No se pudo cancelar.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  const totalExercises = activeSession?.exercises.length ?? 0;
  const resolvedExercises =
    activeSession?.exercises.filter(
      (exercise) => exercise.status === 'completado' || exercise.status === 'omitido',
    ).length ?? 0;

  return (
    <Screen
      title="Inicio"
      description={
        activeSession
          ? 'Tienes un entrenamiento sin terminar.'
          : 'Aquí aparecerán las rutinas que te toquen hoy.'
      }
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <FormMessage tone="error">{error}</FormMessage>
      ) : null}

      {!loading && activeSession ? (
        <View
          style={{
            marginTop: spacing.lg,
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
          }}
        >
          <Text style={[typography.caption, { color: colors.primary, letterSpacing: 1 }]}>
            SESIÓN EN CURSO
          </Text>

          <Text style={[typography.subtitle, { color: colors.text, marginTop: spacing.sm }]}>
            Empezada a las {startTimeLabel(activeSession.started_at)}
          </Text>

          <Text style={[typography.body, { color: colors.textMuted, marginTop: 4 }]}>
            {resolvedExercises} de {totalExercises} ejercicios resueltos.
          </Text>

          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Button
              label="Continuar entrenamiento"
              onPress={() => router.push(`/sesion/${activeSession.id}` as never)}
            />
            <Button
              label="Cancelar entrenamiento"
              variant="ghost"
              loading={cancelling}
              disabled={cancelling}
              onPress={handleCancel}
            />
          </View>
        </View>
      ) : null}

      {!loading && !activeSession && !error ? (
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.lg }]}>
          No hay ningún entrenamiento en curso.
        </Text>
      ) : null}
    </Screen>
  );
}
