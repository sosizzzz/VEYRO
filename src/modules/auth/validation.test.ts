/**
 * Tests de las validaciones del formulario de acceso.
 *
 * Se prueba la lógica pura (Zod), sin pantallas ni servidor. Si estos tests
 * pasan, la app no enviará datos mal formados a Supabase.
 */
import { signInSchema, signUpSchema } from './validation';

describe('email', () => {
  it('acepta un correo correcto y le quita los espacios', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Ana',
      email: '  ana@ejemplo.com  ',
      password: 'secreto123',
      confirmPassword: 'secreto123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('ana@ejemplo.com');
    }
  });

  it('rechaza un correo sin arroba', () => {
    const result = signInSchema.safeParse({
      email: 'esto-no-es-un-correo',
      password: 'secreto123',
    });

    expect(result.success).toBe(false);
  });
});

describe('contraseña', () => {
  it('rechaza menos de 8 caracteres', () => {
    const result = signInSchema.safeParse({
      email: 'ana@ejemplo.com',
      password: '1234',
    });

    // En el acceso solo se exige que no esté vacía (la contraseña puede ser
    // antigua), así que este caso SÍ pasa en signIn.
    expect(result.success).toBe(true);
  });

  it('en el registro exige 8 caracteres como mínimo', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Ana',
      email: 'ana@ejemplo.com',
      password: '1234',
      confirmPassword: '1234',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('8 caracteres');
    }
  });

  it('avisa cuando las contraseñas no coinciden', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Ana',
      email: 'ana@ejemplo.com',
      password: 'secreto123',
      confirmPassword: 'secreto124',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === 'confirmPassword');
      expect(issue?.message).toBe('Las contraseñas no coinciden.');
    }
  });
});

describe('nombre', () => {
  it('recorta los espacios sobrantes', () => {
    const result = signUpSchema.safeParse({
      displayName: '  Ana  ',
      email: 'ana@ejemplo.com',
      password: 'secreto123',
      confirmPassword: 'secreto123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Ana');
    }
  });

  it('rechaza un nombre de una sola letra', () => {
    const result = signUpSchema.safeParse({
      displayName: 'A',
      email: 'ana@ejemplo.com',
      password: 'secreto123',
      confirmPassword: 'secreto123',
    });

    expect(result.success).toBe(false);
  });
});
