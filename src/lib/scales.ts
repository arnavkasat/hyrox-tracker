/**
 * Named 1-5 scales for the morning check-in.
 *
 * Still stored as integers, so nothing downstream changes — the words are
 * only how you pick and read them. `label` has to fit a fifth of a phone
 * screen; `description` is the longer phrasing used in summaries.
 */

export type ScalePoint = {
  value: number;
  label: string;
  description: string;
};

export const ENERGY_SCALE: ScalePoint[] = [
  { value: 1, label: "Empty", description: "Running on empty" },
  { value: 2, label: "Flat", description: "Flat" },
  { value: 3, label: "Steady", description: "Steady" },
  { value: 4, label: "Charged", description: "Charged" },
  { value: 5, label: "Electric", description: "Electric" },
];

export const SORENESS_SCALE: ScalePoint[] = [
  { value: 1, label: "Fresh", description: "Fresh, no complaints" },
  { value: 2, label: "Niggles", description: "Minor niggles" },
  { value: 3, label: "Tender", description: "Tender but fine" },
  { value: 4, label: "Sore", description: "Properly sore" },
  { value: 5, label: "Wrecked", description: "Wrecked" },
];

export function scaleLabel(scale: ScalePoint[], value: number | null): string {
  if (value === null) return "—";
  return scale.find((p) => p.value === value)?.label ?? String(value);
}
