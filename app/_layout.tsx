/**
 * Layout raíz: lo primero que monta Expo Router.
 *
 * Responsabilidades:
 * 1. Envolver la app en `SafeAreaProvider` (muescas y zonas seguras).
 * 2. Envolverla en `AuthProvider` (quién ha iniciado sesión).
 * 3. Mientras se comprueba la sesión guardada, mostrar una pantalla de carga.
 * 4. Declarar los dos grupos de rutas: `(tabs)` y `(auth)`.
 *
 * Los paréntesis significan "grupo": no añaden nada a la URL, solo organizan.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/modules/auth';
import { LoadingScreen } from '@/ui/components/LoadingScreen';

// Permite que Expo Router capture errores de cualquier pantalla y muestre
// un aviso en lugar de cerrar la app.
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const scheme = useColorScheme();
  const { isLoading } = useAuth();

  // Sin este paso se vería el login un instante aunque ya hubiera sesión.
  if (isLoading) {
    return <LoadingScreen message="Comprobando tu sesión…" />;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </>
  );
}
