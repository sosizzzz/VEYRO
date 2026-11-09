/**
 * Navegación dentro de Gestión (Rutinas y Ejercicios).
 */
import { Stack } from 'expo-router';

export default function GestionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="ejercicios/index" options={{ title: 'Ejercicios' }} />
      <Stack.Screen name="ejercicios/nuevo" options={{ title: 'Nuevo ejercicio' }} />
      <Stack.Screen name="ejercicios/[id]" options={{ title: 'Editar ejercicio' }} />
      <Stack.Screen name="ejercicios/archivados" options={{ title: 'Archivados' }} />
      <Stack.Screen name="rutinas/index" options={{ title: 'Rutinas' }} />
      <Stack.Screen name="rutinas/nuevo" options={{ title: 'Nueva rutina' }} />
      <Stack.Screen name="rutinas/[id]" options={{ title: 'Editar rutina' }} />
      <Stack.Screen name="rutinas/archivadas" options={{ title: 'Rutinas archivadas' }} />
    </Stack>
  );
}
