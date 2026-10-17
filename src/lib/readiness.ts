/**
 * A single number for "how ready are you today".
 *
 * Blends what you reported with what your watch measured. Each component is
 * scored 0-100 independently, then averaged over whichever ones exist — so
 * the score still works on a morning with no health data, it's just based
 * on less. Nothing is imputed: a missing input drops out rather than being
 * guessed at.
 *
 *   mood   50%   energy and soreness from the check-in
 *   sleep  25%   last night, against a target
 *   hrv    25%   against your own trailing baseline, not a population norm
 */

export type ReadinessInput = {
  energy?: number | null;
  soreness?: number | null;
  sleepHours?: number | null;
  hrv?: number | null;
  /** Trailing mean HRV. Without it, HRV can't be scored. */
  hrvBaseline?: number | null;
};

export type ReadinessPart = {
  key: "mood" | "sleep" | "hrv";
  label: string;
  score: number;
  weight: number;
  detail: string;
};

export type Readiness = {
  score: number;
  parts: ReadinessPart[];
};

/** Enough sleep to score full marks. */
const SLEEP_TARGET_HOURS = 8;

/** HRV this far below baseline scores zero; this far above scores full. */
const HRV_SWING = 0.3;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function readiness(input: ReadinessInput): Readiness | null {
  const parts: ReadinessPart[] = [];

  // Energy reads high-is-good, soreness low-is-good, so soreness inverts.
  if (input.energy != null && input.soreness != null) {
    parts.push({
      key: "mood",
      label: "How you feel",
      score: clamp(((input.energy + (6 - input.soreness)) / 10) * 100),
      weight: 0.5,
      detail: `energy ${input.energy}/5, soreness ${input.soreness}/5`,
    });
  }

  if (input.sleepHours != null && input.sleepHours > 0) {
    parts.push({
      key: "sleep",
      label: "Sleep",
      score: clamp((input.sleepHours / SLEEP_TARGET_HOURS) * 100),
      weight: 0.25,
      detail: `${input.sleepHours.toFixed(1)}h`,
    });
  }

  // HRV is only meaningful against your own history — absolute values vary
  // enormously between people and say nothing on their own.
  if (input.hrv != null && input.hrvBaseline != null && input.hrvBaseline > 0) {
    const ratio = input.hrv / input.hrvBaseline;
    parts.push({
      key: "hrv",
      label: "HRV",
      score: clamp(((ratio - (1 - HRV_SWING)) / (HRV_SWING * 2)) * 100),
      weight: 0.25,
      detail: `${Math.round(input.hrv)} vs ${Math.round(input.hrvBaseline)} baseline`,
    });
  }

  if (parts.length === 0) return null;

  // Re-weight over whatever is present, so a missing input doesn't drag the
  // score down — it just stops contributing.
  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const score = Math.round(
    parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight,
  );

  return { score, parts };
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

/** Mean of the last `window` values. */
export function rollingAverage(values: number[], window: number): number | null {
  const recent = values.slice(-window).filter((v) => Number.isFinite(v));
  if (recent.length === 0) return null;
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}

/**
 * Your own HRV baseline: the trailing mean over roughly a month.
 * Returns null until there's enough history to mean anything.
 */
export function hrvBaseline(values: number[], minimumSamples = 5): number | null {
  const recent = values.slice(-30).filter((v) => Number.isFinite(v) && v > 0);
  if (recent.length < minimumSamples) return null;
  return recent.reduce((sum, v) => sum + v, 0) / recent.length;
}
