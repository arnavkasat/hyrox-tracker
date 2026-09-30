import { normalizeIngest } from "@/lib/health/parse";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label}${ok ? "" : `\n         got ${a}\n         want ${e}`}`);
}

console.log("— realistic payload —");
const payload = {
  data: {
    metrics: [
      { name: "resting_heart_rate", units: "count/min",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 51.4 }] },
      { name: "heart_rate_variability", units: "ms",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 68.2 }] },
      { name: "step_count", units: "count",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 8412.6 },
               { date: "2026-09-30 00:00:00 +0000", qty: 10233 }] },
      { name: "dietary_energy", units: "kJ",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 11500 }] },
      { name: "protein", units: "g",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 138.4 }] },
      { name: "sleep_analysis", units: "hr",
        data: [{ date: "2026-09-29 00:00:00 +0000", inBed: 8.4, core: 4.1, deep: 1.2, rem: 1.6 }] },
      { name: "flights_climbed", units: "count",
        data: [{ date: "2026-09-29 00:00:00 +0000", qty: 12 }] },
    ],
    workouts: [
      { name: "Running", start: "2026-09-29 06:12:00 +0000", end: "2026-09-29 06:45:00 +0000",
        duration: 1980, distance: { qty: 5.4, units: "km" }, avgHeartRate: { qty: 152 } },
      { name: "Running", start: "2026-09-29 06:12:00 +0000", end: "2026-09-29 06:45:00 +0000",
        duration: 1980, distance: { qty: 5.4, units: "km" }, avgHeartRate: { qty: 152 } },
      { name: "Traditional Strength Training", start: "2026-09-28 17:00:00 +0000",
        duration: 3600, avgHeartRate: { qty: 118 } },
    ],
  },
};

const r = normalizeIngest(payload);
const d29 = r.metrics.get("2026-09-29")!;
check("resting hr rounds", d29.resting_hr, 51);
check("hrv keeps decimals", d29.hrv_ms, 68.2);
check("steps round", d29.steps, 8413);
check("kJ converts to kcal", d29.calories, Math.round(11500 / 4.184));
check("protein", d29.protein_g, 138.4);
check("sleep sums stages, ignores inBed", d29.sleep_hours, 6.9);
check("second day captured", r.metrics.get("2026-09-30")!.steps, 10233);
check("unknown metric reported", r.ignored, ["flights_climbed"]);
check("duplicate workouts both present pre-dedupe", r.workouts.length, 3);
check("pace computed", r.workouts[0].pace_sec_per_km, Math.round(1980 / 5.4));
check("strength workout has no pace", r.workouts[2].pace_sec_per_km, null);
check("timestamp normalised", r.workouts[0].started_at, "2026-09-29T06:12:00.000Z");

console.log("\n— unit + shape variations —");
const miles = normalizeIngest({ data: { workouts: [
  { name: "Running", start: "2026-09-29T06:00:00Z", duration: 1800, distance: { qty: 3.1, units: "mi" } },
]}});
check("miles convert to km", miles.workouts[0].distance_km, Math.round(3.1 * 1.609344 * 1000) / 1000);

const mins = normalizeIngest({ data: { workouts: [
  { name: "Swim", start: "2026-09-29T06:00:00Z", duration: 45 },
]}});
check("minutes read as minutes", mins.workouts[0].duration_sec, 2700);

const noEnvelope = normalizeIngest({ metrics: [
  { name: "step_count", units: "count", data: [{ date: "2026-09-29T00:00:00Z", qty: 500 }] },
]});
check("works without a data envelope", noEnvelope.metrics.get("2026-09-29")!.steps, 500);

const totalSleep = normalizeIngest({ data: { metrics: [
  { name: "sleep_analysis", units: "min", data: [{ date: "2026-09-29T00:00:00Z", totalSleep: 447 }] },
]}});
check("sleep in minutes converts", totalSleep.metrics.get("2026-09-29")!.sleep_hours, 7.45);

console.log("\n— junk in, no throw —");
for (const junk of [null, {}, [], "nope", { data: null }, { data: { metrics: "x", workouts: 3 } },
                    { data: { metrics: [{ name: "step_count", data: [{ date: "garbage", qty: 1 }] }] } }]) {
  const out = normalizeIngest(junk);
  console.log(`  ok   ${String(JSON.stringify(junk)).slice(0, 42)} -> ${out.metrics.size} days, ${out.workouts.length} workouts`);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
