import { z } from 'zod';

export const routineNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(80, 'El nombre no puede superar los 80 caracteres.');

const setTargetSchema = z.object({
  set_number: z.number().int().min(1),
  target_weight: z.number().nullable().optional(),
  target_reps: z.number().int().min(0).nullable().optional(),
  target_time_seconds: z.number().int().min(0).nullable().optional(),
});

const routineExerciseSchema = z.object({
  exercise_id: z.string().uuid('Ejercicio no válido.'),
  exercise_name: z.string().optional(),
  sets: z.array(setTargetSchema).min(1, 'Cada ejercicio debe tener al menos 1 serie.'),
});

export const routineDraftSchema = z.object({
  name: routineNameSchema,
  description: z.string().trim().max(500).optional().or(z.literal('')),
  weekdays: z.array(z.number().int().min(1).max(7)),
  exercises: z.array(routineExerciseSchema).min(1, 'Añade al menos 1 ejercicio a la rutina.'),
});

export type RoutineDraftValues = z.infer<typeof routineDraftSchema>;
