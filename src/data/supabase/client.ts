/**
 * Cliente de Supabase: la única puerta de entrada a la base de datos.
 *
 * Toda la app importa este `supabase`. Si algún día cambia la forma de
 * conectarse, se cambia aquí y en ningún otro sitio.
 *
 * Este archivo pertenece a la capa de datos (`src/data`). Ninguna pantalla
 * debe importar Supabase directamente (AGENTS.md).
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/config/env';

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    /**
     * Dónde se guarda la sesión en el móvil.
     * AsyncStorage es el almacenamiento local estándar de React Native.
     * Gracias a esto, al cerrar y abrir la app sigues dentro.
     */
    storage: AsyncStorage,

    /**
     * Renueva el token de acceso automáticamente antes de que caduque.
     * Así no se cierra la sesión mientras entrenas.
     */
    autoRefreshToken: true,

    /** Guarda la sesión entre arranques de la app. */
    persistSession: true,

    /**
     * En web, Supabase puede leer la sesión de la URL.
     * En una app móvil no hay URL de navegador, así que se desactiva.
     */
    detectSessionInUrl: false,
  },
});

/**
 * Renovación del token según el estado de la app.
 *
 * Cuando la app pasa a segundo plano, no tiene sentido gastar batería
 * renovando tokens. Al volver a primer plano, se reanuda.
 * Es la práctica recomendada por Supabase para React Native.
 */
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
