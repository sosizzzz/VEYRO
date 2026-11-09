/**
 * Layout raíz: lo primero que monta Expo Router.
 *
 * Responsabilidades:
 * 1. Envolver la app en `SafeAreaProvider` y `AuthProvider`.
 * 2. Mostrar carga mientras se comprueba la sesión guardada.
 * 3. Si el usuario llegó desde un enlace de recuperación, obligarle a fijar
 *    una nueva contraseña antes de entrar en la app.
 * 4. Declarar las rutas principales: `(tabs)`, `(auth)` y `nueva-contrasena`.
 */
import { Redirect, Stack, usePathname } from 'expo-router';
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
  const pathname = usePathname();
  const { isLoading, isPasswordRecovery } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Comprobando tu sesión…" />;
  }

  // Tras pulsar el enlace de recuperación, obligamos a fijar nueva contraseña.
  if (isPasswordRecovery && pathname !== '/nueva-contrasena') {
    return <Redirect href="/nueva-contrasena" />;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="nueva-contrasena" />
      </Stack>
    </>
  );
}
