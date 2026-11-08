/**
 * Contexto de autenticación.
 *
 * Un "contexto" de React es una forma de compartir datos con toda la app sin
 * ir pasándolos de pantalla en pantalla. Aquí comparte quién ha iniciado
 * sesión y las funciones para entrar, registrarse y salir.
 *
 * Cualquier pantalla puede escribir:
 *   const { user, profile, signOut } = useAuth();
 */
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
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

/** Datos y acciones que el contexto pone a disposición de la app. */
type AuthContextValue = {
  /** Sesión de Supabase (incluye el usuario y el token). */
  session: Session | null;
  /** Usuario de autenticación, o `null` si no hay sesión. */
  user: User | null;
  /** Fila de `profiles`, con el nombre visible. */
  profile: Profile | null;
  /** `true` mientras se comprueba la sesión guardada al arrancar. */
  isLoading: boolean;
  /** Atajo: `true` si hay sesión iniciada. */
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    values: Pick<SignUpValues, 'displayName' | 'email' | 'password'>,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * El perfil se guarda junto al id de su dueño. Así, al cambiar de usuario,
   * el perfil antiguo deja de ser válido sin necesidad de borrarlo a mano
   * dentro de un efecto (React desaconseja cambiar estado ahí).
   */
  const [loadedProfile, setLoadedProfile] = useState<{
    userId: string;
    data: Profile | null;
  } | null>(null);

  const user = session?.user ?? null;
  // Se guarda solo el id para no recargar el perfil cuando el token se renueva.
  const userId = user?.id ?? null;

  // Perfil válido solo si pertenece al usuario actual.
  const profile = loadedProfile?.userId === userId ? loadedProfile.data : null;

  /**
   * 1. Al arrancar, recuperar la sesión guardada en el móvil y escuchar
   *    cualquier cambio posterior (entrar, salir, caducar el token).
   */
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      // Evita actualizar estado de un componente que ya no existe.
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /**
   * 2. Cuando cambia el usuario, cargar su perfil de la base de datos.
   *    Se hace en un efecto aparte porque dentro de `onAuthStateChange` no
   *    conviene llamar a Supabase (podría bloquearse).
   */
  useEffect(() => {
    // Sin usuario no hay nada que cargar. No se toca el estado: el perfil
    // mostrado ya es `null` porque no coincide con el `userId` actual.
    if (!userId) {
      return;
    }

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
      signIn: signInWithEmail,
      signUp: signUpWithEmail,
      signOut: signOutService,
    }),
    [session, user, profile, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para consumir el contexto.
 * Si se usa fuera del proveedor, avisa del error en lugar de devolver `null`.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }

  return context;
}
