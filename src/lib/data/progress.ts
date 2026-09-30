/** Everything the Progress dashboard needs, in one place. */

import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, type ISODate } from "@/lib/date";
import { readinessScore, rollingAverage } from "@/lib/readiness";
import type { Benchmark, DailyCheckin, PlanSession, Workout } from "@/lib/supabase/types";

export type WeightPoint = {
  date: ISODate;
  weight: number | null;
  /** Trailing 7-day mean, which is the line the plan actually cares about. */
  average: number | null;
};

export type WeekPoint = {
  week: number;
  label: string;
  sets: number;
  completed: number;
  planned: number;
};

export type ReadinessPoint = {
  date: ISODate;
  label: string;
  score: number | null;
};

export type PacePoint = {
  date: ISODate;
  paceSec: number;
  km: number;
};

export type ProgressData = {
  weight: WeightPoint[];
  weeks: WeekPoint[];
  readiness: ReadinessPoint[];
  paces: PacePoint[];
  benchmarks: Benchmark[];
  latestAverageWeight: number | null;
  totalCompleted: number;
  totalPlannedToDate: number;
  averageReadiness: number | null;
};

const HISTORY_DAYS = 84; // twelve weeks

export async function getProgressData(
  supabase: SupabaseClient,
  userId: string,
  today: ISODate,
): Promise<ProgressData> {
  const since = addDays(today, -HISTORY_DAYS);

  const [checkinsRes, sessionsRes, logsRes, workoutsRes, benchmarksRes] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", userId)
      .gte("date", since)
      .order("date"),
    supabase.from("plan_sessions").select("*").eq("user_id", userId).order("date"),
    // Embed the parent session so completed sets can be bucketed by plan week.
    supabase
      .from("exercise_logs")
      .select("id, completed, plan_sessions!inner(week, date)")
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("started_at", `${since}T00:00:00Z`)
      .order("started_at"),
    supabase.from("benchmarks").select("*").eq("user_id", userId).order("date"),
  ]);

  for (const res of [checkinsRes, sessionsRes, logsRes, workoutsRes, benchmarksRes]) {
    if (res.error) throw res.error;
  }

  const checkins = (checkinsRes.data ?? []) as DailyCheckin[];
  const sessions = (sessionsRes.data ?? []) as PlanSession[];
  const workouts = (workoutsRes.data ?? []) as Workout[];
  const benchmarks = (benchmarksRes.data ?? []) as Benchmark[];

  // ---------------------------------------------------------- weight ----
  const weight: WeightPoint[] = [];
  const seen: number[] = [];
  for (const checkin of checkins) {
    const value = checkin.weight_kg == null ? null : Number(checkin.weight_kg);
    if (value != null) seen.push(value);
    weight.push({
      date: checkin.date,
      weight: value,
      average: seen.length > 0 ? rollingAverage(seen, 7) : null,
    });
  }

  // ------------------------------------------------------- weekly work ----
  const setsByWeek = new Map<number, number>();
  type LogRow = { plan_sessions: { week: number } | { week: number }[] };
  for (const row of (logsRes.data ?? []) as unknown as LogRow[]) {
    const parent = Array.isArray(row.plan_sessions) ? row.plan_sessions[0] : row.plan_sessions;
    if (!parent) continue;
    setsByWeek.set(parent.week, (setsByWeek.get(parent.week) ?? 0) + 1);
  }

  const weekBuckets = new Map<number, { completed: number; planned: number }>();
  for (const session of sessions) {
    // Rest days aren't work, so they shouldn't drag the consistency bar down.
    if (session.type === "rest") continue;
    if (session.date > today) continue;

    const bucket = weekBuckets.get(session.week) ?? { completed: 0, planned: 0 };
    bucket.planned += 1;
    if (session.status === "completed") bucket.completed += 1;
    weekBuckets.set(session.week, bucket);
  }

  const weeks: WeekPoint[] = [...weekBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, bucket]) => ({
      week,
      label: `W${week}`,
      sets: setsByWeek.get(week) ?? 0,
      completed: bucket.completed,
      planned: bucket.planned,
    }));

  // -------------------------------------------------------- readiness ----
  const readiness: ReadinessPoint[] = checkins.slice(-14).map((checkin) => ({
    date: checkin.date,
    label: checkin.date.slice(8),
    score: readinessScore(checkin.energy, checkin.soreness),
  }));

  // ------------------------------------------------------------ paces ----
  const paces: PacePoint[] = workouts
    .filter((w) => w.distance_km != null && Number(w.distance_km) >= 1 && w.duration_sec != null)
    .map((w) => ({
      date: w.started_at.slice(0, 10),
      km: Number(w.distance_km),
      paceSec:
        w.pace_sec_per_km ?? Math.round(Number(w.duration_sec) / Number(w.distance_km)),
    }));

  const readinessScores = readiness
    .map((r) => r.score)
    .filter((s): s is number => s !== null);

  return {
    weight,
    weeks,
    readiness,
    paces,
    benchmarks,
    latestAverageWeight: weight.at(-1)?.average ?? null,
    totalCompleted: [...weekBuckets.values()].reduce((n, b) => n + b.completed, 0),
    totalPlannedToDate: [...weekBuckets.values()].reduce((n, b) => n + b.planned, 0),
    averageReadiness:
      readinessScores.length > 0
        ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
        : null,
  };
}
