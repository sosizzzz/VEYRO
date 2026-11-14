/**
 * Componentes visuales de una sesión de entrenamiento (CT-06 / M-02).
 *
 * `src/ui` no conoce Supabase ni el motor: solo recibe props y avisa con
 * callbacks. Eso permite reutilizarlos en la pantalla de sesión (A-05) y en
 * los resúmenes (M-09).
 */
export { ExerciseProgress } from './ExerciseProgress';
export { RestTimer } from './RestTimer';
export { SetRow, type SetRowResult } from './SetRow';
