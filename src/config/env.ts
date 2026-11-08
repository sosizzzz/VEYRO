/**
 * Configuración leída de las variables de entorno.
 *
 * ¿Por qué no leer `process.env` por toda la app?
 * Porque si falta un valor, el fallo debe aparecer UNA vez, al arrancar,
 * con un mensaje claro, y no un `undefined` en medio de una pantalla.
 *
 * En Expo, las variables que empiezan por `EXPO_PUBLIC_` se sustituyen por su
 * valor al compilar. Deben escribirse siempre completas (`process.env.X`),
 * porque Expo las reemplaza literalmente.
 */
import { z } from 'zod';

/** Forma que deben tener las variables, con sus mensajes de error. */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .refine(
      (value) => /^https?:\/\/.+/i.test(value),
      'EXPO_PUBLIC_SUPABASE_URL debe empezar por https://',
    ),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no puede estar vacía'),
});

const parsedEnv = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!parsedEnv.success) {
  // Se lanza un error explícito al arrancar. Es preferible a fallar más tarde,
  // en mitad de una pantalla, con un mensaje incomprensible.
  const detalle = parsedEnv.error.issues.map((issue) => issue.message).join(' | ');
  throw new Error(
    `Configuración de Supabase incorrecta. Revisa tu archivo .env.local. Detalle: ${detalle}`,
  );
}

/** Configuración ya validada y con nombres cortos para el resto del código. */
export const env = {
  supabaseUrl: parsedEnv.data.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: parsedEnv.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;
