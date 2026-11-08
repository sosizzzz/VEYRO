/**
 * Layout raíz: lo primero que monta Expo Router.
 *
 * Responsabilidades:
 * 1. Envolver toda la app en `SafeAreaProvider` para conocer la muesca y
 *    las zonas seguras del móvil.
 * 2. Pintar la barra de estado con el color correcto según el tema.
 * 3. Declarar el grupo de rutas principal: `(tabs)`.
 *
 * Los paréntesis en `(tabs)` significan "grupo": no añaden nada a la URL,
 * solo agrupan pantallas que comparten menú inferior.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Exportar el ErrorBoundary permite que Expo Router capture errores de
// cualquier pantalla y muestre un aviso en lugar de cerrar la app.
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
