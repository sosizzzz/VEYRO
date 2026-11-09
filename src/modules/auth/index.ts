/**
 * Punto de entrada del módulo de autenticación.
 *
 * Las pantallas importan desde aquí:
 *   import { useAuth, signUpSchema } from '@/modules/auth';
 */
export { AuthProvider, useAuth } from './AuthProvider';
export { translateAuthError } from './errors';
export type { Profile } from './types';
export {
  displayNameSchema,
  emailSchema,
  firstIssueMessage,
  forgotPasswordSchema,
  passwordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
  type SignInValues,
  type SignUpValues,
} from './validation';
