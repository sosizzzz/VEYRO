/**
 * Calendario (pantalla "Calendario").
 *
 * Fase 0: solo la estructura. En la fase 10 se añadirán:
 * - Vista semanal y mensual con número de semana.
 * - Estados por color: verde completada, azul pendiente, rojo pasada.
 *
 * Recuerda: el calendario es informativo y NO inicia entrenamientos.
 */
import { Screen } from '@/ui/components/Screen';

export default function CalendarioScreen() {
  return (
    <Screen
      title="Calendario"
      description="Aquí verás tu planificación y las sesiones realizadas."
    />
  );
}
