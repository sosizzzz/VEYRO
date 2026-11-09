/**
 * Catálogo de músculos (Fase 2).
 *
 * Lista fija para el MVP, aprobada para desbloquear la biblioteca de ejercicios.
 * Cada ejercicio guarda un `primary_muscle` (texto) que debe ser uno de estos valores.
 *
 * La UI muestra los músculos agrupados por zona corporal mediante "divisores"
 * (títulos pequeños) seguidos de sus categorías/músculos.
 */

export type MuscleGroup = {
  /** Título pequeño que actúa como divisor visual en la lista. */
  divider: string;
  /** Músculos/categorías que pertenecen a esta zona. */
  muscles: readonly string[];
};

export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  {
    divider: 'Tren superior',
    muscles: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos'],
  },
  {
    divider: 'Tren inferior',
    muscles: ['Cuádriceps', 'Isquiosurales', 'Glúteos', 'Aductores', 'Gemelos'],
  },
  {
    divider: 'Zona media',
    muscles: ['Core', 'Lumbar'],
  },
  {
    divider: 'Categorías generales',
    muscles: ['Cuerpo completo', 'Cardio', 'Otros'],
  },
] as const;

/** Lista plana de todos los músculos permitidos (útil para validación). */
export const ALL_MUSCLES: readonly string[] = MUSCLE_GROUPS.flatMap((g) => g.muscles);
