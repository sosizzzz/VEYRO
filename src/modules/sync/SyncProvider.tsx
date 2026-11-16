/**
 * Proveedor del estado de sincronización (contrato CT-04).
 *
 * ¿Para qué sirve?
 * Para que cualquier pantalla pueda preguntar “¿estoy sincronizado?” sin
 * conocer AsyncStorage, NetInfo ni Supabase. Además, escucha dos señales y
 * dispara el envío automáticamente:
 * - NetInfo: el móvil vuelve a tener internet.
 * - AppState: la app vuelve a primer plano después de estar en segundo plano.
 *
 * Se coloca dentro de `AuthProvider`, porque hasta que sabemos quién ha
 * iniciado sesión no tiene sentido enviar nada.
 */
import NetInfo from '@react-native-community/netinfo';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/modules/auth';
import { flushSyncQueue, getSyncStatus } from '@/modules/workouts/services/syncService';
import type { SyncStatus } from '@/types/sync';

type SyncContextValue = SyncStatus & {
  /** Vuelve a leer el estado (útil tras guardar un cambio). */
  refresh: () => Promise<void>;
  /** Fuerza un intento de envío ahora mismo. */
  flush: () => Promise<void>;
};

const initialStatus: SyncStatus = {
  state: 'synced',
  pendingCount: 0,
  isOnline: true,
  lastError: null,
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const ownerId = user?.id;

  const [status, setStatus] = useState<SyncStatus>(initialStatus);

  /** Lee la cola y actualiza lo que ve la interfaz. */
  const refresh = useCallback(async () => {
    if (!ownerId) {
      setStatus(initialStatus);
      return;
    }
    setStatus(await getSyncStatus(ownerId));
  }, [ownerId]);

  /** Intenta enviar la cola y luego refresca el indicador. */
  const flush = useCallback(async () => {
    if (!ownerId) return;
    setStatus((current) => ({ ...current, state: 'syncing' }));
    await flushSyncQueue(ownerId);
    await refresh();
  }, [ownerId, refresh]);

  // Al entrar (o al cambiar de cuenta) se intenta vaciar lo que quedó pendiente.
  // Se usa `.then` en vez de llamar a `flush()` directamente para no actualizar
  // el estado sincrónicamente dentro del efecto (regla de React que evita
  // repintados en cascada).
  useEffect(() => {
    if (isLoading || !ownerId) return;
    void flushSyncQueue(ownerId).then(() => {
      void refresh();
    });
  }, [isLoading, ownerId, refresh]);

  // Reacciona a “volvió la red” y a “volvió a la app”.
  useEffect(() => {
    if (isLoading || !ownerId) return;

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online) {
        void flush();
      } else {
        void refresh();
      }
    });

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') void flush();
    };
    const subscription = AppState.addEventListener('change', onAppState);

    return () => {
      unsubscribeNet();
      subscription.remove();
    };
  }, [isLoading, ownerId, flush, refresh]);

  return (
    <SyncContext.Provider value={{ ...status, refresh, flush }}>
      {children}
    </SyncContext.Provider>
  );
}

/** Hook para leer el estado desde cualquier pantalla. */
export function useSync(): SyncContextValue {
  const value = useContext(SyncContext);
  if (!value) {
    throw new Error('useSync debe usarse dentro de <SyncProvider>.');
  }
  return value;
}
