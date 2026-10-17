/**
 * The week's facts, computed before anything is asked of a model.
 *
 * Everything the review reasons about is derived here, deterministically,
 * from what's in the database. The model gets these numbers; it never
 * counts anything itself.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, diffDays, type ISODate } from "@/lib/date";
import { hrvBaseline, readiness } from "@/lib/readiness";
import type {
  DailyCheckin,
  ExerciseLog,
  HealthMetric,
  PlanSession,
  Settings,
  Workout,
} from "@/lib/supabase/types";

export type ExerciseSummary = {
  exercise: string;
  /** Sets completed this week. */
  sets: number;
  topWeight: number | null;
  topReps: number | null;
  /** Every set hit, at the top of its prescribed rep range. */
  cleanSweep: boolean;
};

export type WeekStats = {
  week: number;
  weekStart: ISODate;
  weekEnd: ISODate;

  sessionsPlanned: number;
  sessionsCompleted: number;
  completionRate: number;

  setsCompleted: number;
  exercises: ExerciseSummary[];

  checkinsLogged: number;
  averageReadiness: number | null;
  averageWeight: number | null;
  weightChange: number | null;

  averageSleep: number | null;
  averageRestingHr: number | null;
  averageHrv: number | null;

  runs: { date: ISODate; km: number; paceSec: number }[];
  averagePaceSec: number | null;

  daysToRace: number;
};

/** Monday of the week containing `date`. */
function mondayOf(date: ISODate): ISODate {
  const d = new Date(`${date}T00:00:00Z`);
  const iso = ((d.getUTCDay() + 6) % 7) + 1;
  return addDays(date, -(iso - 1));
}

export async function collectWeekStats(
  supabase: SupabaseClient,
  userId: string,
  settings: Settings,
  /** Any date inside the week being reviewed. */
  inWeek: ISODate,
): Promise<WeekStats | null> {
  const weekStart = mondayOf(inWeek);
  const weekEnd = addDays(weekStart, 6);

  const [sessionsRes, logsRes, checkinsRes, healthRes, workoutsRes, hrvRes] =
    await Promise.all([
      supabase
        .from("plan_sessions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .order("date"),
      supabase
        .from("exercise_logs")
        .select("*, plan_sessions!inner(date)")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("plan_sessions.date", weekStart)
        .lte("plan_sessions.date", weekEnd),
      supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("date", addDays(weekStart, -7))
        .lte("date", weekEnd)
        .order("date"),
      supabase
        .from("health_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("date", weekStart)
        .lte("date", weekEnd),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .gte("started_at", `${weekStart}T00:00:00Z`)
        .lte("started_at", `${weekEnd}T23:59:59Z`),
      // A month of HRV, so the baseline means something.
      supabase
        .from("health_metrics")
        .select("hrv_ms")
        .eq("user_id", userId)
        .gte("date", addDays(weekEnd, -30))
        .lte("date", weekEnd),
    ]);

  for (const res of [sessionsRes, logsRes, checkinsRes, healthRes, workoutsRes, hrvRes]) {
    if (res.error) throw res.error;
  }

  const sessions = (sessionsRes.data ?? []) as PlanSession[];
  if (sessions.length === 0) return null;

  const logs = (logsRes.data ?? []) as (ExerciseLog & { plan_sessions: unknown })[];
  const allCheckins = (checkinsRes.data ?? []) as DailyCheckin[];
  const health = (healthRes.data ?? []) as HealthMetric[];
  const workouts = (workoutsRes.data ?? []) as Workout[];

  const checkins = allCheckins.filter((c) => c.date >= weekStart);
  const priorCheckins = allCheckins.filter((c) => c.date < weekStart);

  // ------------------------------------------------------- sessions ----
  const trainable = sessions.filter((s) => s.type !== "rest");
  const completed = trainable.filter((s) => s.status === "completed");

  // ------------------------------------------------------ exercises ----
  const byExercise = new Map<string, ExerciseLog[]>();
  for (const log of logs) {
    const list = byExercise.get(log.exercise) ?? [];
    list.push(log);
    byExercise.set(log.exercise, list);
  }

  const prescribedTop = new Map<string, number>();
  for (const session of sessions) {
    for (const p of session.planned) {
      const range = p.reps.match(/(\d+)\s*-\s*(\d+)/);
      const single = p.reps.match(/^(\d+)$/);
      const top = range ? parseInt(range[2], 10) : single ? parseInt(single[1], 10) : null;
      if (top != null) prescribedTop.set(p.exercise, top);
    }
  }

  const exercises: ExerciseSummary[] = [...byExercise.entries()].map(
    ([exercise, entries]) => {
      const weights = entries.map((e) => (e.weight_kg == null ? null : Number(e.weight_kg)));
      const reps = entries.map((e) => e.reps);
      const top = prescribedTop.get(exercise);

      return {
        exercise,
        sets: entries.length,
        topWeight: weights.some((w) => w != null)
          ? Math.max(...weights.filter((w): w is number => w != null))
          : null,
        topReps: reps.some((r) => r != null)
          ? Math.max(...reps.filter((r): r is number => r != null))
          : null,
        // Every set at or above the top of the prescribed range is the
        // signal that the load is ready to move up.
        cleanSweep:
          top != null &&
          entries.length > 0 &&
          entries.every((e) => e.reps != null && e.reps >= top),
      };
    },
  );

  // ------------------------------------------------------- readiness ----
  const baseline = hrvBaseline(
    ((hrvRes.data ?? []) as { hrv_ms: number | null }[])
      .map((r) => (r.hrv_ms == null ? null : Number(r.hrv_ms)))
      .filter((v): v is number => v != null),
  );

  const healthByDate = new Map(health.map((h) => [h.date, h]));
  const readinessScores = checkins
    .map((c) => {
      const day = healthByDate.get(c.date);
      return readiness({
        energy: c.energy,
        soreness: c.soreness,
        sleepHours: day?.sleep_hours == null ? null : Number(day.sleep_hours),
        hrv: day?.hrv_ms == null ? null : Number(day.hrv_ms),
        hrvBaseline: baseline,
      })?.score;
    })
    .filter((s): s is number => s != null);

  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

  const weights = checkins
    .map((c) => (c.weight_kg == null ? null : Number(c.weight_kg)))
    .filter((v): v is number => v != null);
  const priorWeights = priorCheckins
    .map((c) => (c.weight_kg == null ? null : Number(c.weight_kg)))
    .filter((v): v is number => v != null);

  const thisWeekWeight = mean(weights);
  const lastWeekWeight = mean(priorWeights);

  // ------------------------------------------------------------ runs ----
  const runs = workouts
    .filter(
      (w) =>
        /run/i.test(w.type) &&
        w.distance_km != null &&
        Number(w.distance_km) >= 1 &&
        w.duration_sec != null,
    )
    .map((w) => ({
      date: w.started_at.slice(0, 10) as ISODate,
      km: Number(w.distance_km),
      paceSec:
        w.pace_sec_per_km ?? Math.round(Number(w.duration_sec) / Number(w.distance_km)),
    }));

  return {
    week: sessions[0].week,
    weekStart,
    weekEnd,
    sessionsPlanned: trainable.length,
    sessionsCompleted: completed.length,
    completionRate: trainable.length === 0 ? 0 : completed.length / trainable.length,
    setsCompleted: logs.length,
    exercises: exercises.sort((a, b) => b.sets - a.sets),
    checkinsLogged: checkins.length,
    averageReadiness: readinessScores.length ? Math.round(mean(readinessScores)!) : null,
    averageWeight: thisWeekWeight,
    weightChange:
      thisWeekWeight != null && lastWeekWeight != null
        ? thisWeekWeight - lastWeekWeight
        : null,
    averageSleep: mean(
      health.map((h) => (h.sleep_hours == null ? null : Number(h.sleep_hours)))
        .filter((v): v is number => v != null),
    ),
    averageRestingHr: mean(
      health.map((h) => h.resting_hr).filter((v): v is number => v != null),
    ),
    averageHrv: mean(
      health.map((h) => (h.hrv_ms == null ? null : Number(h.hrv_ms)))
        .filter((v): v is number => v != null),
    ),
    runs,
    averagePaceSec: runs.length ? Math.round(mean(runs.map((r) => r.paceSec))!) : null,
    daysToRace: diffDays(weekEnd, settings.race_date),
  };
}
