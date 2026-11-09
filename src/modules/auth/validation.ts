/**
 * Validaciones del formulario de acceso.
 *
 * Se usa Zod, una librería que describe "cómo deben ser los datos" y devuelve
 * un mensaje claro en español cuando algo no encaja.
 *
 * ¿Por qué no validar solo con `if`?
 * Porque así las reglas están en un único sitio, se pueden probar con tests y
 * la pantalla solo tiene que preguntar "¿son válidos estos datos?".
 */
import { z } from 'zod';

/**
 * Correo electrónico.
 * - `trim()` quita espacios al principio y al final (copiar y pegar).
 * - `pipe()` encadena: primero se limpia, después se comprueba el formato.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Escribe tu correo electrónico.')
  .pipe(z.email('El correo no tiene un formato válido.'));

/**
 * Contraseña.
 * 8 caracteres como mínimo: es la recomendación habitual y más segura que 6.
 * 72 es el máximo que admite el algoritmo de cifrado de Supabase.
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.');

/** Nombre visible que se mostrará en la app. */
export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(40, 'El nombre no puede superar los 40 caracteres.');

/** Formulario de registro completo. */
export const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  // Las dos contraseñas deben coincidir. El error se asocia al segundo campo
  // gracias a `path`, para poder señalarlo en la interfaz.
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

/** Formulario de inicio de sesión. */
export const signInSchema = z.object({
  email: emailSchema,
  // Aquí no se exige longitud: si la contraseña guardada es antigua, la
  // validación del servidor dará el error correcto. Solo se pide que no esté vacía.
  password: z.string().min(1, 'Escribe tu contraseña.'),
});

/** Formulario de recuperación de contraseña (solicitar enlace). */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Formulario para fijar una nueva contraseña tras el enlace de recuperación. */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

/** Tipos derivados de los esquemas, para no escribirlos dos veces. */
export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Devuelve el primer mensaje de error de una validación fallida.
 * La interfaz muestra un aviso cada vez, no una lista interminable.
 */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Revisa los datos del formulario.';
}
