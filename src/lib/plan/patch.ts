/**
 * The one way anything writes to plan_sessions.
 *
 * The block editor, the AI chat and the weekly review all produce
 * `SessionPatch[]` and all go through `validatePatches` before anything
 * reaches the database. One validator means the guardrails can't drift
 * apart between the three of them.
 *
 * Guardrails are stricter for machine-authored changes than for yours:
 * you are the authority on your own plan, the model is a suggestion engine.
 */

import { diffDays, isoWeekday, type ISODate } from "@/lib/date";
import type { PlannedExercise, SessionType } from "@/lib/plan/template";
import type { PlanSession } from "@/lib/supabase/types";

export type PatchAuthor = "user" | "review";

export type SessionPatch = {
  date: ISODate;
  title?: string;
  type?: SessionType;
  planned?: PlannedExercise[];
  notes?: string | null;
  with_partner?: boolean;
};

export type Issue = {
  date: ISODate | null;
  message: string;
};

export type ValidationResult =
  | { ok: true; patches: SessionPatch[]; warnings: Issue[] }
  | { ok: false; issues: Issue[] };

/** Most volume a machine-authored change may add or remove in one week. */
const MAX_REVIEW_VOLUME_CHANGE = 0.15;

/** Every week needs at least this many days with nothing prescribed. */
const MIN_REST_DAYS_PER_WEEK = 1;

const MAX_SETS = 20;

/** Total prescribed sets, the crude volume measure the guardrails use. */
export function volumeOf(planned: PlannedExercise[]): number {
  return planned.reduce((total, p) => total + Math.max(0, p.sets), 0);
}

function isRestLike(session: { planned: PlannedExercise[]; type: SessionType }): boolean {
  return session.type === "rest" || session.planned.length === 0;
}

/**
 * @param patches   what the author wants to change
 * @param existing  the sessions those patches target, plus the rest of their
 *                  weeks, so week-level rules can be checked
 * @param author    'user' gets structural safety only; 'review' also gets
 *                  the volume cap and the rest-day floor
 * @param raceDate  race day, which no patch may repurpose
 */
export function validatePatches(
  patches: SessionPatch[],
  existing: PlanSession[],
  author: PatchAuthor,
  raceDate: ISODate,
): ValidationResult {
  const issues: Issue[] = [];
  const warnings: Issue[] = [];

  const byDate = new Map(existing.map((s) => [s.date, s]));
  const seen = new Set<ISODate>();

  for (const patch of patches) {
    const current = byDate.get(patch.date);

    if (seen.has(patch.date)) {
      issues.push({ date: patch.date, message: "Two changes target the same day." });
      continue;
    }
    seen.add(patch.date);

    if (!current) {
      issues.push({ date: patch.date, message: "That day isn't part of the plan." });
      continue;
    }

    // --- rules that apply to every author --------------------------------

    if (current.status === "completed") {
      issues.push({
        date: patch.date,
        message: "This session is already logged — it can't be rewritten.",
      });
      continue;
    }

    if (patch.date === raceDate && patch.type && patch.type !== "race") {
      issues.push({ date: patch.date, message: "Race day can't be changed to another session." });
      continue;
    }

    if (patch.title !== undefined && patch.title.trim().length === 0) {
      issues.push({ date: patch.date, message: "A session needs a title." });
    }

    for (const exercise of patch.planned ?? []) {
      if (exercise.exercise.trim().length === 0) {
        issues.push({ date: patch.date, message: "An exercise is missing a name." });
      }
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1 || exercise.sets > MAX_SETS) {
        issues.push({
          date: patch.date,
          message: `"${exercise.exercise}" needs between 1 and ${MAX_SETS} sets.`,
        });
      }
      if (exercise.reps.trim().length === 0) {
        issues.push({ date: patch.date, message: `"${exercise.exercise}" needs a target.` });
      }
    }

    // --- rules that only constrain machine-authored changes ---------------

    if (author === "review") {
      if (patch.planned) {
        const before = volumeOf(current.planned);
        const after = volumeOf(patch.planned);
        if (before > 0) {
          const change = Math.abs(after - before) / before;
          if (change > MAX_REVIEW_VOLUME_CHANGE) {
            issues.push({
              date: patch.date,
              message: `Volume change of ${Math.round(change * 100)}% exceeds the ${Math.round(
                MAX_REVIEW_VOLUME_CHANGE * 100,
              )}% cap.`,
            });
          }
        }
      }

      if (current.status === "in_progress") {
        issues.push({
          date: patch.date,
          message: "This session is underway — the review can't change it.",
        });
      }
    } else if (current.status === "in_progress") {
      warnings.push({
        date: patch.date,
        message: "This session is underway. Editing it won't remove sets you've already logged.",
      });
    }
  }

  // --- week-level rules --------------------------------------------------

  if (author === "review") {
    for (const [week, days] of groupWeeks(patches, existing)) {
      const restDays = days.filter(isRestLike).length;
      if (restDays < MIN_REST_DAYS_PER_WEEK) {
        issues.push({
          date: null,
          message: `Week ${week} would be left without a rest day.`,
        });
      }
    }
  } else {
    for (const [week, days] of groupWeeks(patches, existing)) {
      if (days.filter(isRestLike).length === 0) {
        warnings.push({ date: null, message: `Week ${week} has no rest day.` });
      }
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, patches, warnings };
}

/** The affected weeks, with patches applied, so week rules see the result. */
function groupWeeks(
  patches: SessionPatch[],
  existing: PlanSession[],
): Map<number, { planned: PlannedExercise[]; type: SessionType }[]> {
  const patchByDate = new Map(patches.map((p) => [p.date, p]));
  const touchedWeeks = new Set(
    patches.map((p) => existing.find((s) => s.date === p.date)?.week).filter((w): w is number => w !== undefined),
  );

  const weeks = new Map<number, { planned: PlannedExercise[]; type: SessionType }[]>();

  for (const session of existing) {
    if (!touchedWeeks.has(session.week)) continue;
    const patch = patchByDate.get(session.date);
    const list = weeks.get(session.week) ?? [];
    list.push({
      planned: patch?.planned ?? session.planned,
      type: patch?.type ?? session.type,
    });
    weeks.set(session.week, list);
  }

  return weeks;
}

/** Sunday-to-Saturday isn't how this plan counts weeks; Monday starts them. */
export function isWeekStart(date: ISODate): boolean {
  return isoWeekday(date) === 1;
}

export function daysBetweenInclusive(from: ISODate, to: ISODate): number {
  return diffDays(from, to) + 1;
}
