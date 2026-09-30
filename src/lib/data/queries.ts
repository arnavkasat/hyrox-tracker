import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { ensureBootstrapped } from "@/lib/data/bootstrap";
import { today as todayIn, type ISODate } from "@/lib/date";
import type {
  DailyCheckin,
  ExerciseLog,
  PlanSession,
  Settings,
} from "@/lib/supabase/types";

export type AppContext = {
  supabase: SupabaseClient;
  user: User;
  settings: Settings;
  /** Today's date in the athlete's timezone, not the server's. */
  today: ISODate;
};

/** Everything a page needs before it can render. Redirects if signed out. */
export async function getAppContext(): Promise<AppContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const settings = await ensureBootstrapped(supabase, user.id);
  return { supabase, user, settings, today: todayIn(settings.timezone) };
}

export async function getSessionForDate(
  supabase: SupabaseClient,
  userId: string,
  date: ISODate,
): Promise<PlanSession | null> {
  const { data, error } = await supabase
    .from("plan_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data as PlanSession | null;
}

/** Every planned session, oldest first. ~140 rows for a 20-week block. */
export async function getAllSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanSession[]> {
  const { data, error } = await supabase
    .from("plan_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("date");

  if (error) throw error;
  return (data ?? []) as PlanSession[];
}

/** The sessions making up the given plan weeks, for week-level validation. */
export async function getSessionsInWeeks(
  supabase: SupabaseClient,
  userId: string,
  weeks: number[],
): Promise<PlanSession[]> {
  if (weeks.length === 0) return [];

  const { data, error } = await supabase
    .from("plan_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("week", weeks)
    .order("date");

  if (error) throw error;
  return (data ?? []) as PlanSession[];
}

export async function getCheckinForDate(
  supabase: SupabaseClient,
  userId: string,
  date: ISODate,
): Promise<DailyCheckin | null> {
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return data as DailyCheckin | null;
}

export async function getLogsForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<ExerciseLog[]> {
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("session_id", sessionId)
    .order("exercise_order")
    .order("set_number");

  if (error) throw error;
  return (data ?? []) as ExerciseLog[];
}

export type LastPerformance = { weight_kg: number | null; reps: number | null };

/**
 * The most recent completed set for each of `exercises`, used to prefill the
 * set rows so you rarely have to type a number.
 *
 * Postgres `distinct on` isn't reachable through PostgREST, so this pulls a
 * recent window of completed sets and reduces it in memory. At one session a
 * day that window covers months.
 */
export async function getLastPerformances(
  supabase: SupabaseClient,
  userId: string,
  exercises: string[],
  excludeSessionId?: string,
): Promise<Map<string, LastPerformance>> {
  const result = new Map<string, LastPerformance>();
  if (exercises.length === 0) return result;

  let query = supabase
    .from("exercise_logs")
    .select("exercise, weight_kg, reps, completed_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .in("exercise", exercises)
    .order("completed_at", { ascending: false })
    .limit(400);

  if (excludeSessionId) query = query.neq("session_id", excludeSessionId);

  const { data, error } = await query;
  if (error) throw error;

  for (const row of data ?? []) {
    if (!result.has(row.exercise)) {
      result.set(row.exercise, { weight_kg: row.weight_kg, reps: row.reps });
    }
  }

  return result;
}

/** Hours since the last Health Auto Export sync, or null if it never ran. */
export function hoursSinceSync(lastSyncAt: string | null): number | null {
  if (!lastSyncAt) return null;
  return (Date.now() - new Date(lastSyncAt).getTime()) / 3_600_000;
}
