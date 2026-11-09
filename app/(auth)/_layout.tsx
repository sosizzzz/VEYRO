/**
 * Layout del grupo de rutas de acceso.
 *
 * El grupo `(auth)` no aparece en la URL. Sirve para agrupar las pantallas
 * que se muestran SIN sesión: entrar y registrarse.
 *
 * Si ya hay sesión, `Redirect` manda al usuario al inicio. Al ser una
 * redirección declarativa, no se ve ni un parpadeo del formulario.
 */
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/modules/auth';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
