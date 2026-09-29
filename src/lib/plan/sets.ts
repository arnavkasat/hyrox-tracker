/** Turning a planned session into the set rows the Train tab renders. */

import type { ExerciseKind, PlannedExercise } from "@/lib/plan/template";
import type { ExerciseLog } from "@/lib/supabase/types";
import type { LastPerformance } from "@/lib/data/queries";

export type SetRow = {
  exercise: string;
  exercise_order: number;
  set_number: number;
  kind: ExerciseKind;
  /** The prescription, e.g. "5-8" or "AMRAP". Shown above the rows. */
  target: string;
  note?: string;
  weight_kg: number | null;
  reps: number | null;
  completed: boolean;
};

/**
 * Best guess at a starting rep count from a prescription string:
 * "5-8" -> 5, "12-15" -> 12, "20" -> 20, "AMRAP" -> 8.
 */
export function parseTargetReps(target: string): number | null {
  const range = target.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) return parseInt(range[1], 10);

  const single = target.match(/^(\d+)/);
  if (single) return parseInt(single[1], 10);

  if (/amrap/i.test(target)) return 8;
  return null;
}

/** Whether a row needs a weight input at all. */
export function usesWeight(kind: ExerciseKind): boolean {
  return kind === "weight" || kind === "carry";
}

/** Whether a row needs a rep input. */
export function usesReps(kind: ExerciseKind): boolean {
  return kind === "weight" || kind === "bodyweight";
}

/**
 * Merges three sources, in priority order:
 *   1. sets already logged for this session (what you actually did)
 *   2. the last time you did this exercise (the prefill)
 *   3. the plan's prescription (the fallback)
 */
export function buildSetRows(
  planned: PlannedExercise[],
  logs: ExerciseLog[],
  lastPerformances: Map<string, LastPerformance>,
): SetRow[] {
  const byKey = new Map(logs.map((l) => [`${l.exercise}#${l.set_number}`, l]));
  const rows: SetRow[] = [];

  planned.forEach((exercise, order) => {
    const last = lastPerformances.get(exercise.exercise);
    const targetReps = parseTargetReps(exercise.reps);

    for (let setNumber = 1; setNumber <= Math.max(1, exercise.sets); setNumber++) {
      const logged = byKey.get(`${exercise.exercise}#${setNumber}`);

      rows.push({
        exercise: exercise.exercise,
        exercise_order: order,
        set_number: setNumber,
        kind: exercise.kind,
        target: exercise.reps,
        note: exercise.note,
        weight_kg: logged?.weight_kg ?? last?.weight_kg ?? (usesWeight(exercise.kind) ? 20 : null),
        reps: logged?.reps ?? last?.reps ?? targetReps,
        completed: logged?.completed ?? false,
      });
    }
  });

  return rows;
}

/** Groups rows back into their exercises, preserving plan order. */
export function groupByExercise(rows: SetRow[]): { exercise: string; rows: SetRow[] }[] {
  const groups = new Map<string, SetRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.exercise);
    if (existing) existing.push(row);
    else groups.set(row.exercise, [row]);
  }
  return [...groups.entries()].map(([exercise, rows]) => ({ exercise, rows }));
}
