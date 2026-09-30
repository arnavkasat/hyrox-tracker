/**
 * Normalising Health Auto Export payloads.
 *
 * The app posts roughly this shape, though names and units vary by version
 * and by what you've enabled:
 *
 *   { "data": {
 *       "metrics":  [{ "name": "step_count", "units": "count",
 *                      "data": [{ "date": "2026-09-30 00:00:00 +0000", "qty": 8412 }] }],
 *       "workouts": [{ "name": "Running", "start": "...", "duration": 1800,
 *                      "distance": { "qty": 5.2, "units": "km" } }]
 *   }}
 *
 * Everything here is defensive: an unrecognised metric is skipped rather
 * than failing the request, because a partial sync is far better than a
 * rejected one. Nothing here touches the network, so it's easy to test.
 */

import type { ISODate } from "@/lib/date";

export type MetricFields = {
  resting_hr: number | null;
  hrv_ms: number | null;
  sleep_hours: number | null;
  calories: number | null;
  protein_g: number | null;
  steps: number | null;
};

export type NormalizedWorkout = {
  started_at: string;
  type: string;
  duration_sec: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  pace_sec_per_km: number | null;
};

export type NormalizedIngest = {
  metrics: Map<ISODate, Partial<MetricFields>>;
  workouts: NormalizedWorkout[];
  /** Metric names we saw but don't store — useful when debugging a sync. */
  ignored: string[];
};

/** Health Auto Export metric name -> our column. */
const METRIC_COLUMNS: Record<string, keyof MetricFields> = {
  resting_heart_rate: "resting_hr",
  heart_rate_variability: "hrv_ms",
  heart_rate_variability_sdnn: "hrv_ms",
  sleep_analysis: "sleep_hours",
  dietary_energy: "calories",
  dietary_energy_consumed: "calories",
  protein: "protein_g",
  step_count: "steps",
  steps: "steps",
};

const KJ_PER_KCAL = 4.184;
const KM_PER_MILE = 1.609344;

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Health Auto Export sends "2026-09-30 06:12:00 +0000", which `new Date()`
 * does not reliably parse. Nudge it into ISO first.
 */
export function parseTimestamp(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const nudged = new Date(raw.replace(" ", "T").replace(/\s*([+-]\d{2}):?(\d{2})$/, "$1:$2"));
  return Number.isNaN(nudged.getTime()) ? null : nudged;
}

/** Named apart from `toISODate` in lib/date, which takes a Date, not junk. */
export function timestampToISODate(value: unknown): ISODate | null {
  const date = parseTimestamp(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Converts a value into the unit we store, based on what the app said. */
function convert(column: keyof MetricFields, value: number, units: string | null): number {
  const u = (units ?? "").toLowerCase();

  if (column === "calories" && (u === "kj" || u === "kilojoules")) {
    return value / KJ_PER_KCAL;
  }
  if (column === "sleep_hours") {
    if (u.startsWith("min")) return value / 60;
    if (u.startsWith("s")) return value / 3600;
  }
  if (column === "hrv_ms" && u === "s") return value * 1000;

  return value;
}

/**
 * Sleep arrives either as a plain quantity or as a breakdown. When it's a
 * breakdown, time actually asleep is what matters — time in bed flatters
 * the number.
 */
function sleepHours(entry: Record<string, unknown>, units: string | null): number | null {
  // Best case: the app already totalled it.
  const total = num(entry.totalSleep) ?? num(entry.asleep);
  if (total != null) return convert("sleep_hours", total, units);

  // Otherwise add the stages. Time in bed is deliberately not counted —
  // it flatters the number by including however long you lay there awake.
  const stages = [entry.core, entry.deep, entry.rem]
    .map(num)
    .filter((v): v is number => v != null);

  if (stages.length > 0) {
    const summed = stages.reduce((a, b) => a + b, 0);
    if (summed > 0) return convert("sleep_hours", summed, units);
  }

  const qty = num(entry.qty);
  return qty == null ? null : convert("sleep_hours", qty, units);
}

export function normalizeIngest(body: unknown): NormalizedIngest {
  const metrics = new Map<ISODate, Partial<MetricFields>>();
  const workouts: NormalizedWorkout[] = [];
  const ignored: string[] = [];

  const root = record(body);
  // Some versions nest under "data", others post the object directly.
  const data = record(root?.data) ?? root;
  if (!data) return { metrics, workouts, ignored };

  // ------------------------------------------------------------ metrics --
  const metricList = Array.isArray(data.metrics) ? data.metrics : [];
  for (const raw of metricList) {
    const metric = record(raw);
    if (!metric) continue;

    const name = str(metric.name)?.toLowerCase();
    if (!name) continue;

    const column = METRIC_COLUMNS[name];
    if (!column) {
      if (!ignored.includes(name)) ignored.push(name);
      continue;
    }

    const units = str(metric.units);
    const points = Array.isArray(metric.data) ? metric.data : [];

    for (const rawPoint of points) {
      const point = record(rawPoint);
      if (!point) continue;

      const date = timestampToISODate(point.date);
      if (!date) continue;

      const value =
        column === "sleep_hours" ? sleepHours(point, units) : num(point.qty);
      if (value == null) continue;

      const existing = metrics.get(date) ?? {};
      const converted = column === "sleep_hours" ? value : convert(column, value, units);

      // Counts are whole numbers; the rest keep two decimals.
      existing[column] =
        column === "steps" || column === "calories" || column === "resting_hr"
          ? Math.round(converted)
          : Math.round(converted * 100) / 100;

      metrics.set(date, existing);
    }
  }

  // ----------------------------------------------------------- workouts --
  const workoutList = Array.isArray(data.workouts) ? data.workouts : [];
  for (const raw of workoutList) {
    const workout = record(raw);
    if (!workout) continue;

    const started = parseTimestamp(workout.start ?? workout.startDate);
    if (!started) continue;

    const type = str(workout.name) ?? str(workout.workoutActivityType) ?? "Workout";

    const distanceField = record(workout.distance);
    const distanceRaw = num(distanceField?.qty) ?? num(workout.distance);
    const distanceUnits = (str(distanceField?.units) ?? "km").toLowerCase();
    const distanceKm =
      distanceRaw == null
        ? null
        : distanceUnits.startsWith("mi")
          ? distanceRaw * KM_PER_MILE
          : distanceRaw;

    let durationSec = num(workout.duration);
    if (durationSec == null) {
      const ended = parseTimestamp(workout.end ?? workout.endDate);
      if (ended) durationSec = Math.round((ended.getTime() - started.getTime()) / 1000);
    }
    // Some versions report duration in minutes.
    if (durationSec != null && durationSec > 0 && durationSec < 100) durationSec *= 60;

    const avgHr =
      num(record(workout.avgHeartRate)?.qty) ??
      num(workout.avgHeartRate) ??
      num(record(workout.averageHeartRate)?.qty) ??
      null;

    workouts.push({
      started_at: started.toISOString(),
      type,
      duration_sec: durationSec == null ? null : Math.round(durationSec),
      distance_km: distanceKm == null ? null : Math.round(distanceKm * 1000) / 1000,
      avg_hr: avgHr == null ? null : Math.round(avgHr),
      pace_sec_per_km:
        distanceKm != null && distanceKm >= 0.1 && durationSec != null && durationSec > 0
          ? Math.round(durationSec / distanceKm)
          : null,
    });
  }

  return { metrics, workouts, ignored };
}
