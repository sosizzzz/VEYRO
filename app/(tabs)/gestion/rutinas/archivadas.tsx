/**
 * Rutinas archivadas: ocultas del listado normal, recuperables.
 * (No se pueden usar para iniciar entrenamientos nuevos hasta recuperarlas.)
 */
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import { listArchivedRoutines, restoreRoutine, type RoutineListItem } from '@/modules/routines';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

const DAY_LABELS: Record<number, string> = {
  1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D',
};

export default function RutinasArchivadasScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [items, setItems] = useState<RoutineListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setError(null);
    setLoading(true);
    try {
      setItems(await listArchivedRoutines(ownerId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las archivadas.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRestore(id: string) {
    try {
      await restoreRoutine(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo recuperar.');
    }
  }

  return (
    <Screen title="Rutinas archivadas" description="Ocultas del listado. Puedes recuperarlas.">
      <View style={{ marginTop: spacing.md }}>
        <Button label="Nueva rutina" onPress={() => router.push('/(tabs)/gestion/rutinas/nuevo')} />
        <Link href={"/(tabs)/gestion/rutinas/index" as any} style={{ marginTop: spacing.sm, paddingVertical: 4 }}>
          <Text style={[typography.caption, { color: colors.primary }]}>Volver a Rutinas</Text>
        </Link>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <Text style={[typography.body, { color: colors.danger, marginTop: spacing.md }]}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, marginTop: spacing.md }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.textMuted }]}>
              No hay rutinas archivadas.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                },
              ]}
            >
              <Text style={[typography.body, { color: colors.text }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {item.exercise_count} ejercicios ·{' '}
                {item.weekdays.map((d) => DAY_LABELS[d] ?? d).join(' ') || 'Sin días'}
              </Text>
              <Pressable onPress={() => handleRestore(item.id)} style={{ marginTop: spacing.sm }}>
                <Text style={[typography.caption, { color: colors.primary }]}>Recuperar</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderWidth: 1, marginTop: 8 },
});
