/**
 * Catálogo de ejercicios (Fase 2).
 * - Agrupado por grupo muscular con divisores (Tren superior, etc.).
 * - Botón Añadir siempre visible.
 * - Búsqueda por nombre y acceso a archivados.
 */
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/modules/auth';
import {
  MUSCLE_GROUPS,
  listActiveExercises,
  type Exercise,
} from '@/modules/exercises';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useTheme } from '@/ui/theme';

type SectionItem = Exercise & { _sk: string };
type Section = { title: string; data: SectionItem[] };

export default function EjerciciosScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const ownerId = user?.id;

  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!ownerId) return;
    setError(null);
    setLoading(true);
    try {
      const data = await listActiveExercises(ownerId);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los ejercicios.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((ex) => ex.name.toLowerCase().includes(q));
  }, [items, query]);

  // Agrupa por las zonas principales (Tren superior, etc.). Cada ejercicio
  // aparece una sola vez por zona (evita repeticiones cuando tiene varios músculos).
  const sections: Section[] = useMemo(() => {
    const result: Section[] = [];
    for (const group of MUSCLE_GROUPS) {
      const data = filtered
        .filter((ex) => (ex.primary_muscles ?? []).some((m) => group.muscles.includes(m)))
        .map((ex) => ({ ...ex, _sk: group.divider }));
      if (data.length > 0) {
        result.push({ title: group.divider, data });
      }
    }
    return result;
  }, [filtered]);

  return (
    <Screen title="Ejercicios" description="Biblioteca agrupada por grupo muscular.">
      {/* Acciones siempre visibles dentro del catálogo */}
      <View style={{ marginTop: spacing.md }}>
        <Button
          label="Añadir ejercicio"
          onPress={() => router.push('/(tabs)/gestion/ejercicios/nuevo')}
        />
        <View style={[styles.rowActions, { marginTop: spacing.sm }]}>
          <Link href="/(tabs)/gestion/ejercicios/archivados" style={styles.link}>
            <Text style={[typography.caption, { color: colors.primary }]}>Ver archivados</Text>
          </Link>
          <Link href="/(tabs)/gestion" style={styles.link}>
            <Text style={[typography.caption, { color: colors.primary }]}>Volver a Gestión</Text>
          </Link>
        </View>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar ejercicio…"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.search,
          {
            borderColor: colors.border,
            color: colors.text,
            borderRadius: radius.md,
            marginTop: spacing.md,
            padding: spacing.sm,
          },
        ]}
      />

      {loading ? (
        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={[typography.body, { color: colors.danger, marginTop: spacing.md }]}>{error}</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item._sk}-${item.id}`}
          style={{ flex: 1, marginTop: spacing.md }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(tabs)/gestion/ejercicios/${item.id}` as any)}
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
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.lg }]}>
              {query ? 'No hay resultados.' : 'Aún no tienes ejercicios. Pulsa “Añadir ejercicio”.'}
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1 },
  item: { borderWidth: 1, marginTop: 8 },
  rowActions: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { paddingVertical: 4 },
});
