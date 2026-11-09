/**
 * Casos de uso de ejercicios (acceso a datos vía Supabase).
 *
 * Las pantallas llaman a estas funciones; no hablan con Supabase directamente.
 * La seguridad real la aplican las políticas RLS en la base de datos, pero
 * aquí filtramos por `owner_id` para ser explícitos y claros.
 */
import { supabase } from '@/data/supabase/client';

import type { Exercise } from '../types';
import type { ExerciseFormValues } from '../validation';

const COLUMNS =
  'id, owner_id, name, description, icon, primary_muscles, archived_at, source_exercise_id, created_at';

/** Lista ejercicios activos (no archivados) del usuario, ordenados por nombre. */
export async function listActiveExercises(ownerId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(COLUMNS)
    .eq('owner_id', ownerId)
    .is('archived_at', null)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as Exercise[] | null) ?? [];
}

/** Lista ejercicios archivados del usuario. */
export async function listArchivedExercises(ownerId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(COLUMNS)
    .eq('owner_id', ownerId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return (data as Exercise[] | null) ?? [];
}

/** Crea un ejercicio nuevo para el usuario. */
export async function createExercise(
  ownerId: string,
  values: ExerciseFormValues,
): Promise<Exercise> {
  const payload = {
    owner_id: ownerId,
    name: values.name.trim(),
    description: values.description?.trim() || null,
    icon: values.icon?.trim() || null,
    primary_muscles: values.primary_muscles,
  };

  const { data, error } = await supabase
    .from('exercises')
    .insert(payload)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data as Exercise;
}

/** Actualiza un ejercicio existente (solo campos editables). */
export async function updateExercise(
  id: string,
  values: ExerciseFormValues,
): Promise<Exercise> {
  const payload = {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    icon: values.icon?.trim() || null,
    primary_muscles: values.primary_muscles,
  };

  const { data, error } = await supabase
    .from('exercises')
    .update(payload)
    .eq('id', id)
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return data as Exercise;
}

/** Archiva un ejercicio (no lo borra). */
export async function archiveExercise(id: string): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/** Recupera un ejercicio archivado. */
export async function restoreExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').update({ archived_at: null }).eq('id', id);

  if (error) throw error;
}

/** Obtiene un ejercicio por id (del usuario autenticado; RLS protege). */
export async function getExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as Exercise | null) ?? null;
}
