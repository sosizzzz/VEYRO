/**
 * Gestión (pantalla "Gestión").
 *
 * Aquí viven los dos accesos principales: Rutinas y Ejercicios.
 * En la fase 0 solo se muestra la estructura; las listas llegan en las
 * fases 2 y 3.
 */
import { Screen } from '@/ui/components/Screen';

export default function GestionScreen() {
  return (
    <Screen
      title="Gestión"
      description="Desde aquí se crearán y editarán tus rutinas y ejercicios."
    />
  );
}
