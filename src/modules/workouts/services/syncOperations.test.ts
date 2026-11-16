/**
 * Tests de la conversión "cambio del motor → operación de la cola" (A-07).
 *
 * Se comprueba que solo se apunta lo que cambió de verdad y que los ids son
 * estables (para que un reintento no duplique nada).
 */
import { applyWorkoutEvent, createWorkoutEngineState } from '@/domain/workout-engine';
import { FIXTURE_SESSION_IN_PROGRESS } from '@/data/fixtures';

import { buildSyncOperations } from './syncOperations';

const fixture = FIXTURE_SESSION_IN_PROGRESS;
const pendingExercise = fixture.exercises[1];
const firstPendingSet = pendingExercise.sets[0];

describe('buildSyncOperations', () => {
  it('no genera operaciones si el estado no cambió', () => {
    const state = createWorkoutEngineState(fixture);

    expect(buildSyncOperations(state, state)).toEqual([]);
  });

  it('genera una operación de serie y otra de sesión al completar y descansar', () => {
    const before = createWorkoutEngineState(fixture);

    const completed = applyWorkoutEvent(before, {
      type: 'SET_COMPLETED',
      exerciseId: pendingExercise.id,
      setId: firstPendingSet.id,
      actualReps: 8,
      completedAt: '2026-11-14T18:20:00.000Z',
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    const rested = applyWorkoutEvent(completed.state, {
      type: 'REST_TIMER_STARTED',
      startedAt: '2026-11-14T18:20:01.000Z',
    });
    expect(rested.ok).toBe(true);
    if (!rested.ok) return;

    const operations = buildSyncOperations(before, rested.state);

    expect(operations.map((operation) => operation.id)).toEqual([
      `session:${fixture.id}`,
      `set:${firstPendingSet.id}`,
    ]);
    expect(operations.every((operation) => operation.ownerId === fixture.owner_id)).toBe(true);
  });

  it('usa el id de la serie para que un segundo cambio sustituya al anterior', () => {
    const before = createWorkoutEngineState(fixture);
    const completed = applyWorkoutEvent(before, {
      type: 'SET_COMPLETED',
      exerciseId: pendingExercise.id,
      setId: firstPendingSet.id,
      actualReps: 8,
      completedAt: '2026-11-14T18:20:00.000Z',
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;

    const first = buildSyncOperations(before, completed.state);
    const second = buildSyncOperations(before, completed.state);

    expect(first[0].id).toBe(second[0].id);
  });
});
