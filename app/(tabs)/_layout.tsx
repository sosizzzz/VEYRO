/**
 * Menú inferior: las tres secciones del MVP (PROJECT.md §11).
 *
 * - Izquierda: Calendario.
 * - Centro: Inicio.
 * - Derecha: Gestión (rutinas y ejercicios).
 *
 * El orden de las pestañas lo decide el orden de los `Tabs.Screen`.
 */
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/ui/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // Color del icono y del texto de la pestaña seleccionada.
        tabBarActiveTintColor: colors.primary,
        // Cada pantalla dibuja su propio título, así que ocultamos la cabecera.
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="gestion"
        options={{
          title: 'Gestión',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
