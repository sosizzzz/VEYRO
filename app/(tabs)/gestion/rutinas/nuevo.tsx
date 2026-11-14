/**
 * Pantalla "Nueva rutina".
 *
 * Solo hace tres cosas:
 * 1. Cargar los ejercicios activos del usuario (la "biblioteca").
 * 2. Pintar el formulario compartido `RoutineForm`.
 * 3. Guardar la rutina cuando el formulario lo pide.
 *
 * Toda la interfaz y la lógica del formulario están en `RoutineForm`,
 * que también usa la pantalla de edición. Así no duplicamos código.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '@/modules/auth';
import { listActiveExercises, type Exercise } from '@/modules/exercises';
import {
  RoutineForm,
  saveRoutine,
  type RoutineDraftValues,
} from '@/modules/routines';
import { FormMessage } from '@/ui/components/FormMessage';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

/** Rutina vacía con la que arranca el formulario. */
const EMPTY_DRAFT: RoutineDraftValues = {
  name: '',
  description: '',
  weekdays: [],
  exercises: [],
};

export default function NuevaRutinaScreen() {
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) return;

    let cancelled = false;

    (async () => {
      try {
        const exercises = await listActiveExercises(ownerId);
        if (!cancelled) setLibrary(exercises);
      } catch (cause) {
        if (!cancelled) {
          setLoadError(
            cause instanceof Error ? cause.message : 'No se pudo cargar la biblioteca.',
          );
        }
      } finally {
        if (!cancelled) setLoadingLibrary(false);
      }
    })();

    // Si la pantalla se cierra antes de terminar, evitamos actualizar estado.
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  return (
    <Screen title="Nueva rutina" description="Define ejercicios, objetivos y días.">
      {loadError ? <FormMessage tone="error">{loadError}</FormMessage> : null}

      {loadingLibrary ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <RoutineForm
          initialDraft={EMPTY_DRAFT}
          library={library}
          submitLabel="Guardar rutina"
          onSubmit={async (values) => {
            if (!ownerId) {
              throw new Error('No hay una sesión activa. Vuelve a iniciar sesión.');
            }

            await saveRoutine(ownerId, null, values);
            router.back();
          }}
        />
      )}
    </Screen>
  );
}
