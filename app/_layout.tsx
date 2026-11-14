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
// Se importa cada peso desde su carpeta para que el paquete no incluya en la
// app las 18 variantes de Inter: solo se empaquetan las tres que usamos.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/modules/auth';
import { LoadingScreen } from '@/ui/components/LoadingScreen';

// Permite que Expo Router capture errores de cualquier pantalla y muestre
// un aviso en lugar de cerrar la app.
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  // Carga las tres variantes de Inter antes de pintar pantallas. Mientras
  // tanto se muestra la pantalla de carga: así no se ve un cambio de letra.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return <LoadingScreen message="Preparando VEYRO…" />;
  }

  // Si la fuente fallara, seguimos con la del sistema en vez de bloquear la app.
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
        <Stack.Screen name="sesion/[sessionId]" />
      </Stack>
    </>
  );
}
