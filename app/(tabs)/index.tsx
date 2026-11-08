/**
 * Tablero de inicio (pantalla "Inicio").
 *
 * Fase 0: solo la estructura. En la fase 10 se rellenará con:
 * - Saludo según la hora y el nombre del usuario.
 * - Rutinas planificadas para hoy.
 * - Acceso directo a empezar el entrenamiento.
 */
import { Screen } from '@/ui/components/Screen';

export default function InicioScreen() {
  return (
    <Screen
      title="Inicio"
      description="Aquí aparecerán las rutinas que te toquen hoy."
    />
  );
}
