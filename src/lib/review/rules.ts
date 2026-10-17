/**
 * The rules that decide what changes.
 *
 * Deliberately deterministic and deliberately first: these run before the
 * model is asked anything, and what they produce is what gets proposed. The
 * model's job is to explain and summarise, not to decide how much weight
 * goes on your bar.
 *
 * Every proposal still goes through `validatePatches` with author "review"
 * before it reaches the database, so a rule with a bug can't bypass the
 * volume cap or the rest-day floor either.
 */

import { addDays, formatPace, type ISODate } from "@/lib/date";
import type { SessionPatch } from "@/lib/plan/patch";
import type { PlanSession, Settings } from "@/lib/supabase/types";
import type { WeekStats } from "@/lib/review/stats";

export type ChangeKind = "overload" | "deload" | "readiness" | "pace";

export type ProposedChange = {
  id: string;
  kind: ChangeKind;
  title: string;
  /** Why, stated in terms of the week's numbers. */
  reason: string;
  patches: SessionPatch[];
  /** Pace rules adjust settings rather than sessions. */
  settings?: Partial<Pick<Settings, "easy_pace_min_sec" | "easy_pace_max_sec" | "race_pace_sec">>;
};

/** Smallest jump worth making on a barbell. */
const WEIGHT_STEP_KG = 2.5;

/** Below this completion rate, a week counts as missed. */
const MISSED_WEEK_RATE = 0.5;

/** Average readiness below this means back off. */
const LOW_READINESS = 50;

/** Volume multiplier when easing off. Inside the 15% guardrail. */
const EASE_OFF_FACTOR = 0.88;

/** Pace is only adjusted on a decent sample. */
const MIN_RUNS_FOR_PACE = 3;

/** How far off target the average pace must be before it's worth moving. */
const PACE_DRIFT_SECONDS = 15;

export function buildProposals(opts: {
  stats: WeekStats;
  previousWeek: WeekStats | null;
  /** Upcoming sessions the proposals may rewrite. */
  upcoming: PlanSession[];
  settings: Settings;
}): ProposedChange[] {
  const { stats, previousWeek, upcoming, settings } = opts;
  const changes: ProposedChange[] = [];

  // ------------------------------------------------ progressive overload --
  // An exercise where every set hit the top of its range is ready for more.
  for (const exercise of stats.exercises) {
    if (!exercise.cleanSweep || exercise.topWeight == null || exercise.topWeight <= 0) {
      continue;
    }

    const next = exercise.topWeight + WEIGHT_STEP_KG;
    const sessions = upcoming.filter((s) =>
      s.planned.some((p) => p.exercise === exercise.exercise),
    );
    if (sessions.length === 0) continue;

    // The load lives on the logged sets, not the plan, so this records the
    // intent as a note rather than rewriting a number that isn't there.
    changes.push({
      id: `overload:${slug(exercise.exercise)}`,
      kind: "overload",
      title: `${exercise.exercise}: go to ${next} kg`,
      reason: `Every set hit ${exercise.topReps} reps at ${exercise.topWeight} kg this week, the top of the prescribed range.`,
      patches: sessions.slice(0, 1).map((session) => ({
        date: session.date,
        planned: session.planned.map((p) =>
          p.exercise === exercise.exercise
            ? { ...p, note: `Work up to ${next} kg` }
            : p,
        ),
      })),
    });
  }

  // ------------------------------------------------------------ deload --
  // Two missed weeks in a row is a pattern, not a bad week.
  const missedThis = stats.completionRate < MISSED_WEEK_RATE;
  const missedLast = previousWeek != null && previousWeek.completionRate < MISSED_WEEK_RATE;

  if (missedThis && missedLast) {
    const targets = upcoming.filter((s) => s.planned.length > 0).slice(0, 6);
    if (targets.length > 0) {
      changes.push({
        id: "deload:missed-weeks",
        kind: "deload",
        title: "Cut next week's volume",
        reason: `Two weeks under half the planned sessions (${Math.round(
          previousWeek!.completionRate * 100,
        )}% then ${Math.round(
          stats.completionRate * 100,
        )}%). A lighter week you finish beats a heavy one you don't.`,
        patches: targets.map((session) => ({
          date: session.date,
          planned: scaleSets(session.planned, EASE_OFF_FACTOR),
        })),
      });
    }
  }

  // ---------------------------------------------------- low readiness --
  // Only when it isn't already being handled as a deload.
  if (!missedThis && stats.averageReadiness != null && stats.averageReadiness < LOW_READINESS) {
    const targets = upcoming.filter((s) => s.planned.length > 0).slice(0, 4);
    if (targets.length > 0) {
      changes.push({
        id: "readiness:low",
        kind: "readiness",
        title: "Ease off the first half of next week",
        reason: `Readiness averaged ${stats.averageReadiness} across ${stats.checkinsLogged} check-ins${
          stats.averageSleep != null ? `, on ${stats.averageSleep.toFixed(1)}h of sleep` : ""
        }.`,
        patches: targets.map((session) => ({
          date: session.date,
          planned: scaleSets(session.planned, EASE_OFF_FACTOR),
        })),
      });
    }
  }

  // -------------------------------------------------------------- pace --
  // Easy runs that are consistently off target mean the target is wrong.
  if (stats.runs.length >= MIN_RUNS_FOR_PACE && stats.averagePaceSec != null) {
    const target = (settings.easy_pace_min_sec + settings.easy_pace_max_sec) / 2;
    const drift = stats.averagePaceSec - target;

    if (Math.abs(drift) > PACE_DRIFT_SECONDS) {
      const shift = Math.round(drift / 5) * 5;
      changes.push({
        id: "pace:easy",
        kind: "pace",
        title:
          drift < 0
            ? `Easy pace is drifting quick — move the band to ${formatPace(settings.easy_pace_min_sec + shift)}-${formatPace(settings.easy_pace_max_sec + shift)}`
            : `Easy pace is drifting slow — move the band to ${formatPace(settings.easy_pace_min_sec + shift)}-${formatPace(settings.easy_pace_max_sec + shift)}`,
        reason: `${stats.runs.length} runs averaged ${formatPace(
          stats.averagePaceSec,
        )}/km against a ${formatPace(settings.easy_pace_min_sec)}-${formatPace(
          settings.easy_pace_max_sec,
        )} target.`,
        patches: [],
        settings: {
          easy_pace_min_sec: settings.easy_pace_min_sec + shift,
          easy_pace_max_sec: settings.easy_pace_max_sec + shift,
        },
      });
    }
  }

  return changes;
}

/** Scales set counts, never below one. Reps are left alone: this is a
 *  volume change, not an intensity change. */
function scaleSets(
  planned: PlanSession["planned"],
  factor: number,
): PlanSession["planned"] {
  return planned.map((p) => ({ ...p, sets: Math.max(1, Math.round(p.sets * factor)) }));
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The days a review is allowed to touch: next week, not this one. */
export function upcomingWindow(weekEnd: ISODate): { from: ISODate; to: ISODate } {
  return { from: addDays(weekEnd, 1), to: addDays(weekEnd, 7) };
}
