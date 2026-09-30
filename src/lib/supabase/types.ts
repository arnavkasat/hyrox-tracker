/**
 * Row types for the tables in supabase/migrations.
 *
 * Hand-written rather than generated, so the repo doesn't need a linked
 * Supabase CLI to typecheck. Keep in sync when you add a migration.
 */

import type { PlannedExercise, Phase, SessionType } from "@/lib/plan/template";
import type { ISODate } from "@/lib/date";

export type Settings = {
  id: string;
  user_id: string;
  race_date: ISODate;
  training_start_date: ISODate;
  timezone: string;
  height_cm: number | null;
  body_weight_kg: number | null;
  calorie_target_min: number;
  calorie_target_max: number;
  protein_target_min: number;
  protein_target_max: number;
  easy_pace_min_sec: number;
  easy_pace_max_sec: number;
  race_pace_sec: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionStatus = "planned" | "in_progress" | "completed" | "skipped";

/** Which writer last owned this row — see 20260930090000_plan_origin.sql. */
export type SessionOrigin = "generated" | "user" | "review";

export type PlanSession = {
  id: string;
  user_id: string;
  date: ISODate;
  week: number;
  phase: Phase;
  type: SessionType;
  title: string;
  planned: PlannedExercise[];
  notes: string | null;
  status: SessionStatus;
  origin: SessionOrigin;
  with_partner: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  session_id: string;
  exercise: string;
  exercise_order: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  effort: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyCheckin = {
  id: string;
  user_id: string;
  date: ISODate;
  weight_kg: number | null;
  energy: number | null;
  soreness: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthMetric = {
  id: string;
  user_id: string;
  date: ISODate;
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  calories: number | null;
  protein_g: number | null;
  steps: number | null;
  created_at: string;
  updated_at: string;
};

export type Workout = {
  id: string;
  user_id: string;
  started_at: string;
  type: string;
  duration_sec: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  pace_sec_per_km: number | null;
  with_partner: boolean;
  source: "health" | "manual";
  created_at: string;
  updated_at: string;
};

export type Benchmark = {
  id: string;
  user_id: string;
  date: ISODate;
  name: string;
  value: number;
  unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  user_id: string;
  date: ISODate;
  week: number | null;
  storage_path: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyReview = {
  id: string;
  user_id: string;
  week_start: ISODate;
  week: number;
  summary: string | null;
  stats: Record<string, unknown>;
  proposed_changes: unknown[];
  decisions: unknown[];
  status: "pending" | "applied" | "rejected" | "partial";
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};
