/**
 * Servicios de rutinas (Fase 3) + archivado (aprobado).
 *
 * Nota: guardar una rutina toca varias tablas. Desde el cliente REST no hay una
 * transacción única multi-tabla, así que se hace en pasos (reemplazando hijos).
 * Para el MVP es suficiente; más adelante se puede mover a una función SQL/RPC.
 *
 * Las pantallas llaman a estas funciones; no hablan con Supabase directamente.
 * RLS (seguridad por fila) en la base de datos protege el acceso real.
 */
import { supabase } from '@/data/supabase/client';

import type { Routine, RoutineDraft } from '../types';

// Columnas que pedimos al listar/detalle básico de rutinas.
const ROUTINE_COLUMNS =
  'id, owner_id, name, description, source_routine_id, archived_at, created_at';

export type RoutineListItem = Routine & {
  exercise_count: number;
  weekdays: number[];
};

/** Dado un conjunto de rutinas, añade nº de ejercicios y días planificados. */
async function enrichRoutineItems(list: Routine[]): Promise<RoutineListItem[]> {
  if (list.length === 0) return [];
  const ids = list.map((r) => r.id);
  const [{ data: exRows }, { data: dayRows }] = await Promise.all([
    supabase.from('routine_exercises').select('routine_id').in('routine_id', ids),
    supabase.from('routine_schedule_days').select('routine_id, weekday').in('routine_id', ids),
  ]);

  const counts = new Map<string, number>();
  for (const row of (exRows as { routine_id: string }[] | null) ?? []) {
    counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
  }
  const days = new Map<string, number[]>();
  for (const row of (dayRows as { routine_id: string; weekday: number }[] | null) ?? []) {
    const arr = days.get(row.routine_id) ?? [];
    arr.push(row.weekday);
    days.set(row.routine_id, arr);
  }

  return list.map((r) => ({
    ...r,
    exercise_count: counts.get(r.id) ?? 0,
    weekdays: (days.get(r.id) ?? []).sort((a, b) => a - b),
  }));
}

/** Lista rutinas ACTIVAS (archived_at es NULL). Las archivadas no aparecen aquí. */
export async function listRoutines(ownerId: string): Promise<RoutineListItem[]> {
  const { data: routines, error } = await supabase
    .from('routines')
    .select(ROUTINE_COLUMNS)
    .eq('owner_id', ownerId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return enrichRoutineItems((routines as Routine[] | null) ?? []);
}

/** Lista rutinas ARCHIVADAS del usuario (para poder recuperarlas). */
export async function listArchivedRoutines(ownerId: string): Promise<RoutineListItem[]> {
  const { data: routines, error } = await supabase
    .from('routines')
    .select(ROUTINE_COLUMNS)
    .eq('owner_id', ownerId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return enrichRoutineItems((routines as Routine[] | null) ?? []);
}

/** Archiva una rutina (no la borra). Desaparece del listado y no se inicia. */
export async function archiveRoutine(id: string): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Recupera una rutina archivada (vuelve a estar activa). */
export async function restoreRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('routines').update({ archived_at: null }).eq('id', id);
  if (error) throw error;
}

/** Detalle para editar. Incluye archived_at para saber si está archivada. */
export async function getRoutineDetail(
  routineId: string,
): Promise<(RoutineDraft & { archived_at: string | null }) | null> {
  const { data: routine, error: rErr } = await supabase
    .from('routines')
    .select('id, name, description, archived_at')
    .eq('id', routineId)
    .maybeSingle();
  if (rErr) throw rErr;
  if (!routine) return null;

  const [{ data: dayRows }, { data: exRows }] = await Promise.all([
    supabase.from('routine_schedule_days').select('weekday').eq('routine_id', routineId),
    supabase
      .from('routine_exercises')
      .select('id, exercise_id, position, exercises(name)')
      .eq('routine_id', routineId)
      .order('position', { ascending: true }),
  ]);

  const weekdays = ((dayRows as { weekday: number }[] | null) ?? []).map((d) => d.weekday);
  const exList = (exRows as any[] | null) ?? [];
  const exIds = exList.map((e) => e.id);

  let targetRows: any[] = [];
  if (exIds.length > 0) {
    const { data: tRows, error: tErr } = await supabase
      .from('routine_set_targets')
      .select('routine_exercise_id, set_number, target_weight, target_reps, target_time_seconds')
      .in('routine_exercise_id', exIds)
      .order('set_number', { ascending: true });
    if (tErr) throw tErr;
    targetRows = (tRows as any[] | null) ?? [];
  }

  const targetsByEx = new Map<string, any[]>();
  for (const t of targetRows) {
    const arr = targetsByEx.get(t.routine_exercise_id) ?? [];
    arr.push(t);
    targetsByEx.set(t.routine_exercise_id, arr);
  }

  return {
    name: routine.name as string,
    description: (routine.description as string | null) ?? '',
    archived_at: (routine.archived_at as string | null) ?? null,
    weekdays,
    exercises: exList.map((e) => ({
      exercise_id: e.exercise_id as string,
      exercise_name: e.exercises?.name as string | undefined,
      sets: (targetsByEx.get(e.id) ?? []).map((t) => ({
        set_number: t.set_number,
        target_weight: t.target_weight,
        target_reps: t.target_reps,
        target_time_seconds: t.target_time_seconds,
      })),
    })),
  };
}

export async function saveRoutine(
  ownerId: string,
  routineId: string | null,
  draft: RoutineDraft,
): Promise<string> {
  let rid = routineId;

  if (!rid) {
    const { data, error } = await supabase
      .from('routines')
      .insert({ owner_id: ownerId, name: draft.name.trim(), description: draft.description?.trim() || null })
      .select('id')
      .single();
    if (error) throw error;
    rid = (data as { id: string }).id;
  } else {
    const { error } = await supabase
      .from('routines')
      .update({ name: draft.name.trim(), description: draft.description?.trim() || null })
      .eq('id', rid);
    if (error) throw error;
  }

  // Reemplazar hijos (orden importa). Borrar ejercicios en cascada borra targets.
  await supabase.from('routine_exercises').delete().eq('routine_id', rid);
  await supabase.from('routine_schedule_days').delete().eq('routine_id', rid);

  if (draft.weekdays.length > 0) {
    const { error } = await supabase.from('routine_schedule_days').insert(
      draft.weekdays.map((weekday) => ({ routine_id: rid, weekday })),
    );
    if (error) throw error;
  }

  for (let i = 0; i < draft.exercises.length; i++) {
    const ex = draft.exercises[i];
    const { data: reRow, error: reErr } = await supabase
      .from('routine_exercises')
      .insert({ routine_id: rid, exercise_id: ex.exercise_id, position: i + 1 })
      .select('id')
      .single();
    if (reErr) throw reErr;
    const reId = (reRow as { id: string }).id;

    if (ex.sets.length > 0) {
      const { error: tErr } = await supabase.from('routine_set_targets').insert(
        ex.sets.map((s, idx) => ({
          routine_exercise_id: reId,
          set_number: s.set_number ?? idx + 1,
          target_weight: s.target_weight ?? null,
          target_reps: s.target_reps ?? null,
          target_time_seconds: s.target_time_seconds ?? null,
        })),
      );
      if (tErr) throw tErr;
    }
  }

  return rid;
}
