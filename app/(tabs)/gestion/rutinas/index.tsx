/**
 * Listado de rutinas activas (las archivadas se ven en "Archivadas").
 */
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/modules/auth';
import { listRoutines, type RoutineListItem } from '@/modules/routines';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

const DAY_LABELS: Record<number, string> = {
  1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D',
};

export default function RutinasScreen() {
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
      setItems(await listRoutines(ownerId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las rutinas.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen title="Rutinas" description="Tus rutinas planificadas.">
      <View style={{ marginTop: spacing.md }}>
        <Button label="Nueva rutina" onPress={() => router.push('/(tabs)/gestion/rutinas/nuevo')} />
        <View style={[styles.rowActions, { marginTop: spacing.sm }]}>
          <Link href="/(tabs)/gestion/rutinas/archivadas" style={styles.link}>
            <Text style={[typography.caption, { color: colors.primary }]}>Ver archivadas</Text>
          </Link>
          <Link href="/(tabs)/gestion" style={styles.link}>
            <Text style={[typography.caption, { color: colors.primary }]}>Volver a Gestión</Text>
          </Link>
        </View>
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
              Aún no tienes rutinas. Pulsa “Nueva rutina”.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(tabs)/gestion/rutinas/${item.id}` as any)}
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
              {item.description ? (
                <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {item.exercise_count} ejercicios · {item.weekdays.map((d) => DAY_LABELS[d] ?? d).join(' ') || 'Sin días'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderWidth: 1, marginTop: 8 },
  rowActions: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { paddingVertical: 4 },
});
