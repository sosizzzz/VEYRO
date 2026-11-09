/**
 * Contexto de autenticación.
 *
 * Comparte con toda la app: sesión, usuario, perfil, estado de carga y
 * acciones (entrar, registrarse, salir). También gestiona el flujo de
 * recuperación de contraseña cuando el usuario vuelve desde el enlace del correo.
 */
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/data/supabase/client';

import {
  signInWithEmail,
  signOut as signOutService,
  signUpWithEmail,
  type SignUpResult,
} from './services/authService';
import { getProfile } from './services/profileService';
import type { Profile } from './types';
import type { SignUpValues } from './validation';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** `true` cuando el usuario ha llegado desde el enlace de recuperación y debe fijar una nueva contraseña. */
  isPasswordRecovery: boolean;
  /** Limpia el modo recuperación (p. ej. tras cambiar la contraseña). */
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    values: Pick<SignUpValues, 'displayName' | 'email' | 'password'>,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Extrae parámetros de una URL (query `?a=b` y fragmento `#a=b`).
 * Supabase puede devolver tokens en el hash (flujo implícito) o un `code` (PKCE).
 */
function getUrlParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  try {
    const qIndex = url.indexOf('?');
    const hIndex = url.indexOf('#');
    if (qIndex !== -1) {
      const query = url.slice(qIndex + 1, hIndex !== -1 ? hIndex : undefined);
      new URLSearchParams(query).forEach((v, k) => params.set(k, v));
    }
    if (hIndex !== -1) {
      const hash = url.slice(hIndex + 1);
      new URLSearchParams(hash).forEach((v, k) => params.set(k, v));
    }
  } catch {
    // Si la URL viene mal formada, devolvemos params vacíos.
  }
  return params;
}

/**
 * Procesa una URL entrante (deep link) de Supabase Auth.
 * Si contiene credenciales de recuperación/intercambio, establece la sesión.
 */
async function handleAuthUrl(url: string): Promise<void> {
  const params = getUrlParams(url);
  const type = params.get('type');
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  // Solo actuamos en flujos relevantes (recuperación u otros callbacks de auth).
  const relevant =
    type === 'recovery' ||
    code ||
    (accessToken && refreshToken);
  if (!relevant) return;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn('[auth] No se pudo intercambiar el código:', error.message);
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) console.warn('[auth] No se pudo establecer la sesión de recuperación:', error.message);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState<{
    userId: string;
    data: Profile | null;
  } | null>(null);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const profile = loadedProfile?.userId === userId ? loadedProfile.data : null;

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession) => {
        setSession(nextSession);
        setIsLoading(false);
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Procesa enlaces entrantes (recuperación de contraseña desde el correo).
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url).catch(() => {});
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url).catch(() => {});
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let isActive = true;

    getProfile(userId)
      .then((perfil) => {
        if (isActive) setLoadedProfile({ userId, data: perfil });
      })
      .catch((error: unknown) => {
        console.warn('[auth] No se pudo cargar el perfil:', error);
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isAuthenticated: session !== null,
      isPasswordRecovery,
      clearPasswordRecovery,
      signIn: signInWithEmail,
      signUp: signUpWithEmail,
      signOut: signOutService,
    }),
    [session, user, profile, isLoading, isPasswordRecovery, clearPasswordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}
