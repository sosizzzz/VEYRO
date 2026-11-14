/**
 * Pantalla "Editar rutina".
 *
 * Carga la rutina desde Supabase, la convierte al formato del formulario,
 * y deja que `RoutineForm` haga el resto (igual que en "Nueva rutina").
 * Además permite archivar o recuperar la rutina.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import { saveLocalSession } from '@/data/local';
import { getErrorMessage } from '@/lib/errors';
import { listActiveExercises, type Exercise } from '@/modules/exercises';
import {
  archiveRoutine,
  getRoutineDetail,
  restoreRoutine,
  RoutineForm,
  saveRoutine,
  type RoutineDraftValues,
} from '@/modules/routines';
import { startSessionFromRoutine } from '@/modules/workouts';
import { Button } from '@/ui/components/Button';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

export default function EditarRutinaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<RoutineDraftValues | null>(null);
  // Si la rutina está archivada se puede recuperar, pero no usar para entrenar.
  const [archived, setArchived] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) return;

    let cancelled = false;

    (async () => {
      try {
        const [exercises, detail] = await Promise.all([
          listActiveExercises(ownerId),
          id ? getRoutineDetail(id) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setLibrary(exercises);

        if (!detail) {
          setError('Rutina no encontrada.');
          return;
        }

        setArchived(Boolean(detail.archived_at));
        setDraft({
          name: detail.name,
          description: detail.description ?? '',
          weekdays: [...(detail.weekdays ?? [])].sort((a, b) => a - b),
          exercises: (detail.exercises ?? []).map((exercise) => ({
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
            sets:
              exercise.sets && exercise.sets.length > 0
                ? exercise.sets.map((set, index) => ({
                    set_number: set.set_number ?? index + 1,
                    target_weight: set.target_weight ?? null,
                    target_reps: set.target_reps ?? null,
                    target_time_seconds: set.target_time_seconds ?? null,
                  }))
                : [
                    {
                      set_number: 1,
                      target_weight: null,
                      target_reps: null,
                      target_time_seconds: null,
                    },
                  ],
          })),
        });
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar la rutina.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, ownerId]);

  /**
   * Inicia un entrenamiento con la versión GUARDADA de la rutina.
   *
   * Si acabas de cambiar algo en el formulario y no has pulsado “Guardar”,
   * esos cambios no se incluyen: la sesión copia lo que hay en Supabase.
   */
  async function handleStart() {
    if (!ownerId || !id) return;

    setStarting(true);
    setError(null);
    try {
      const session = await startSessionFromRoutine(ownerId, id);

      // Se guarda una copia local para que el entrenamiento sobreviva a un
      // cierre de la app. Si falla, no se bloquea: la sesión ya está en la nube.
      saveLocalSession(session).catch(() => {
        // Sin copia local; la pantalla volverá a cargarla desde Supabase.
      });

      router.push(`/sesion/${session.id}` as never);
    } catch (cause) {
      // En desarrollo, Metro muestra el objeto completo: ayuda a distinguir
      // un fallo de red de un rechazo de Supabase.
      console.error('[rutinas] no se pudo iniciar la sesión:', cause);
      setError(
        getErrorMessage(cause, 'No se pudo empezar el entrenamiento.'),
      );
    } finally {
      setStarting(false);
    }
  }

  /** Archiva (oculta, no borra) o recupera la rutina, con confirmación al archivar. */
  async function handleArchiveToggle() {
    if (!id) return;

    if (!archived) {
      Alert.alert(
        'Archivar rutina',
        'Desaparecerá del listado y no podrá usarse para iniciar entrenamientos nuevos. Podrás recuperarla después.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Archivar',
            style: 'destructive',
            onPress: async () => {
              try {
                await archiveRoutine(id);
                router.back();
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'No se pudo archivar.');
              }
            },
          },
        ],
      );
      return;
    }

    try {
      await restoreRoutine(id);
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo recuperar.');
    }
  }

  if (loading || !draft) {
    return (
      <Screen title="Rutina" description={loading ? 'Cargando…' : ''}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text>
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Editar rutina" description="Modifica ejercicios, objetivos y días.">
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <RoutineForm
        initialDraft={draft}
        library={library}
        submitLabel="Guardar cambios"
        onSubmit={async (values) => {
          if (!ownerId || !id) {
            throw new Error('Falta la rutina o la sesión. Vuelve a intentarlo.');
          }

          await saveRoutine(ownerId, id, values);
          router.back();
        }}
        footer={
          <View style={{ gap: spacing.sm }}>
            {!archived ? (
              <Button
                label="Empezar entrenamiento"
                onPress={handleStart}
                loading={starting}
                disabled={starting}
              />
            ) : null}
            <Button
              label={archived ? 'Recuperar rutina' : 'Archivar rutina'}
              variant="ghost"
              onPress={handleArchiveToggle}
            />
          </View>
        }
      />
    </Screen>
  );
}
