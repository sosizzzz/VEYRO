/**
 * Ejercicios archivados: se pueden recuperar (no están borrados).
 */
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import { listArchivedExercises, restoreExercise, type Exercise } from '@/modules/exercises';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

export default function ArchivadosScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setError(null);
    setLoading(true);
    try {
      setItems(await listArchivedExercises(ownerId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los archivados.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleRestore(id: string) {
    try {
      await restoreExercise(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo recuperar.');
    }
  }

  return (
    <Screen title="Archivados" description="Ejercicios que ocultaste del listado general.">
      <View style={{ marginTop: spacing.md }}>
        <Button
          label="Añadir ejercicio"
          onPress={() => router.push('/(tabs)/gestion/ejercicios/nuevo')}
        />
        <Link href={"/(tabs)/gestion/ejercicios/index" as any} style={{ marginTop: spacing.sm, paddingVertical: 4 }}>
          <Text style={[typography.caption, { color: colors.primary }]}>Volver al catálogo</Text>
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
            <Text style={[typography.body, { color: colors.textMuted }]}>No hay ejercicios archivados.</Text>
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
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {(item.primary_muscles ?? []).join(', ')}
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
