/**
 * A single number for "how ready are you today", from the two things the
 * morning check-in asks about.
 *
 * Energy reads high-is-good and soreness reads low-is-good, so soreness is
 * inverted before they're combined. Both are weighted equally: the score is
 * a prompt to think, not a training prescription.
 *
 *   energy 5, soreness 1 -> 100    energy 1, soreness 5 -> 20
 */

export function readinessScore(
  energy: number | null | undefined,
  soreness: number | null | undefined,
): number | null {
  if (energy == null || soreness == null) return null;
  return Math.round(((energy + (6 - soreness)) / 10) * 100);
}

export type ReadinessBand = {
  label: string;
  hint: string;
};

export function readinessBand(score: number | null): ReadinessBand | null {
  if (score == null) return null;
  if (score >= 90) return { label: "Primed", hint: "Good day to chase a number." };
  if (score >= 70) return { label: "Ready", hint: "Take the session as written." };
  if (score >= 50) return { label: "Steady", hint: "Fine to train, watch the top sets." };
  if (score >= 30) return { label: "Laboured", hint: "Drop a set or two and keep it easy." };
  return { label: "Depleted", hint: "Consider swapping this for recovery." };
}

/** Mean of the last `window` weights, the trend line the plan cares about. */
export function rollingAverage(values: number[], window: number): number | null {
  const recent = values.slice(-window).filter((v) => Number.isFinite(v));
  if (recent.length === 0) return null;
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}
