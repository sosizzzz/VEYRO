/**
 * Indicador sencillo del estado de sincronización (tarea M-08).
 *
 * La interfaz solo lee `useSync()`: no sabe si los datos van a Supabase, a un
 * archivo local o a otro sitio. Eso es lo que permite cambiar el almacenamiento
 * sin tocar las pantallas.
 */
import { Text } from 'react-native';

import { useSync } from '@/modules/sync';
import { useTheme } from '@/ui/theme';

export function SyncIndicator() {
  const { state, pendingCount, isOnline } = useSync();
  const { colors, spacing, typography } = useTheme();

  let text = 'Todo sincronizado';
  let color = colors.success;

  if (!isOnline) {
    text = 'Sin conexión · tus cambios siguen en el móvil';
    color = colors.info;
  } else if (state === 'syncing') {
    text = 'Sincronizando…';
    color = colors.info;
  } else if (pendingCount > 0 || state === 'error') {
    text = `Pendiente de sincronizar (${pendingCount})`;
    color = colors.danger;
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={[
        typography.caption,
        { color, marginTop: spacing.xs },
      ]}
    >
      {text}
    </Text>
  );
}
