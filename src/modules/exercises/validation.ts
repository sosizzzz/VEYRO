/**
 * Validación de ejercicios con Zod.
 *
 * Reglas:
 * - Nombre obligatorio y con longitud razonable.
 * - Músculo principal obligatorio y debe pertenecer al catálogo aprobado.
 * - Descripción e icono opcionales.
 */
import { z } from 'zod';

import { ALL_MUSCLES } from './catalog';

export const exerciseNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(80, 'El nombre no puede superar los 80 caracteres.');

export const primaryMusclesSchema = z
  .array(z.string())
  .min(1, 'Selecciona al menos 1 músculo principal.')
  .max(3, 'Puedes seleccionar hasta 3 músculos principales.')
  .refine(
    (values) => values.every((v) => ALL_MUSCLES.includes(v)),
    'Selecciona músculos válidos del catálogo.',
  )
  .refine((values) => new Set(values).size === values.length, 'No repitas músculos.');

export const exerciseSchema = z.object({
  name: exerciseNameSchema,
  description: z
    .string()
    .trim()
    .max(500, 'La descripción no puede superar los 500 caracteres.')
    .optional()
    .or(z.literal('')),
  icon: z.string().trim().max(60).optional().or(z.literal('')),
  primary_muscles: primaryMusclesSchema,
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
