/**
 * Athlete profile and plan defaults, seeded on first sign-in.
 * Everything here is editable in the app afterwards.
 */

export const DEFAULT_SETTINGS = {
  race_date: "2027-02-15", // HYROX doubles, a Monday
  training_start_date: "2026-09-30",
  timezone: "Europe/London", // corrected from the browser on first load
  height_cm: 175.3, // 5'9"
  body_weight_kg: 73,
  calorie_target_min: 2700,
  calorie_target_max: 2900,
  protein_target_min: 130,
  protein_target_max: 145,
  easy_pace_min_sec: 345, // 5:45 / km
  easy_pace_max_sec: 375, // 6:15 / km
  race_pace_sec: 300, // 5:00 / km
} as const;

/** Where the progress bars are pointing by race week. */
export type BenchmarkTarget = {
  name: string;
  label: string;
  unit: string;
  target_min: number;
  target_max: number;
  /** Lower is better (times) vs higher is better (loads and reps). */
  lowerIsBetter?: boolean;
};

export const BENCHMARK_TARGETS: BenchmarkTarget[] = [
  { name: "squat_5rm", label: "Back squat × 5", unit: "kg", target_min: 90, target_max: 100 },
  { name: "deadlift_5rm", label: "Deadlift × 5", unit: "kg", target_min: 110, target_max: 120 },
  { name: "pullups_max", label: "Pull-ups", unit: "reps", target_min: 8, target_max: 10 },
  { name: "wall_balls_unbroken", label: "Wall balls unbroken", unit: "reps", target_min: 30, target_max: 40 },
  { name: "row_1k", label: "1 km row", unit: "s", target_min: 230, target_max: 250, lowerIsBetter: true },
  { name: "ski_1k", label: "1 km SkiErg", unit: "s", target_min: 230, target_max: 250, lowerIsBetter: true },
];
