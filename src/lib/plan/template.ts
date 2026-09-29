/**
 * The 20-week Hyrox doubles training plan, as data.
 *
 * Weeks 1-19 are described by weekday, so Saturday long runs stay on
 * Saturdays. Race week is described by *distance from race day* instead, so
 * the taper lands correctly no matter which weekday the race falls on.
 */

export type ExerciseKind = "weight" | "bodyweight" | "carry" | "run" | "time";

export type PlannedExercise = {
  exercise: string;
  sets: number;
  /** Free text because a target can be "5-8", "AMRAP", "20 steps" or "5 km". */
  reps: string;
  kind: ExerciseKind;
  note?: string;
};

export type SessionType =
  | "lower_hyrox"
  | "easy_run"
  | "upper"
  | "swim_pickleball"
  | "full_body_circuit"
  | "long_run"
  | "rest"
  | "intervals"
  | "partner_hyrox"
  | "race_simulation"
  | "half_simulation"
  | "light_lift"
  | "jog_strides"
  | "race";

export type Phase = "base" | "build" | "peak" | "taper" | "race";

export type SessionTemplate = {
  type: SessionType;
  title: string;
  planned: PlannedExercise[];
  withPartner?: boolean;
  notes?: string;
};

export const TOTAL_WEEKS = 20;

/** Days from race day that the race-week block covers. */
export const RACE_BLOCK_DAYS = 7;

export function phaseForWeek(week: number): Phase {
  if (week <= 8) return "base";
  if (week <= 16) return "build";
  if (week <= 18) return "peak";
  if (week === 19) return "taper";
  return "race";
}

// --------------------------------------------------------------- building --

const w = (exercise: string, sets: number, reps: string, note?: string): PlannedExercise => ({
  exercise,
  sets,
  reps,
  kind: "weight",
  ...(note ? { note } : {}),
});

const bw = (exercise: string, sets: number, reps: string, note?: string): PlannedExercise => ({
  exercise,
  sets,
  reps,
  kind: "bodyweight",
  ...(note ? { note } : {}),
});

const run = (exercise: string, reps: string, note?: string): PlannedExercise => ({
  exercise,
  sets: 1,
  reps,
  kind: "run",
  ...(note ? { note } : {}),
});

// ----------------------------------------------------------- day builders --

const lowerHyrox = (): SessionTemplate => ({
  type: "lower_hyrox",
  title: "Lower + Hyrox",
  planned: [
    w("Back squat", 4, "5-8"),
    w("Romanian deadlift", 3, "8"),
    { exercise: "Walking lunges", sets: 3, reps: "20 steps", kind: "carry" },
    w("Wall balls", 3, "20"),
  ],
});

const upper = (): SessionTemplate => ({
  type: "upper",
  title: "Upper",
  planned: [
    bw("Pull-ups", 4, "AMRAP"),
    w("Incline DB press", 3, "8-10"),
    w("Seated row", 3, "10"),
    w("DB shoulder press", 3, "8-10"),
    w("Lateral raises", 3, "12-15"),
    w("Biceps curls", 3, "10-12"),
    w("Tricep pushdowns", 3, "10-12"),
    { exercise: "Farmers carry", sets: 3, reps: "40 m", kind: "carry" },
  ],
});

const swimOrPickleball = (): SessionTemplate => ({
  type: "swim_pickleball",
  title: "Swim or pickleball",
  planned: [
    { exercise: "Swim or pickleball", sets: 1, reps: "Easy", kind: "time" },
    w("Optional: arms & shoulders", 3, "12-15", "Only if feeling fresh"),
  ],
  notes: "Keep it genuinely easy — this is recovery, not a session.",
});

const fullBodyCircuit = (): SessionTemplate => ({
  type: "full_body_circuit",
  title: "Full body + circuit",
  planned: [
    w("Bench press", 3, "6-8"),
    w("Lat pulldown", 3, "8-10"),
    w("Hammer curls", 3, "10-12"),
    w("Overhead tricep extension", 3, "10-12"),
    { exercise: "Circuit: row, sled, lunges", sets: 1, reps: "15-20 min", kind: "time" },
  ],
});

const restDay = (): SessionTemplate => ({
  type: "rest",
  title: "Rest or easy swim",
  planned: [],
});

const easyRun = (km: number): SessionTemplate => ({
  type: "easy_run",
  title: "Easy run",
  planned: [run("Easy run", `${km} km`, "5:45-6:15 / km")],
});

const intervals = (reps: number): SessionTemplate => ({
  type: "intervals",
  title: `Intervals — ${reps} × 1 km`,
  planned: [
    run("Warm-up", "1.5 km", "Easy"),
    run(`${reps} × 1 km at race pace`, `${reps} × 1 km`, "90 s rest between reps"),
    run("Cool-down", "1 km", "Easy"),
  ],
});

const longRun = (km: number): SessionTemplate => ({
  type: "long_run",
  title: "Long easy run",
  planned: [run("Long run", `${km} km`, "Conversational pace")],
  withPartner: true,
});

const partnerHyrox = (rounds: number): SessionTemplate => ({
  type: "partner_hyrox",
  title: `Partner Hyrox — ${rounds} rounds`,
  planned: [
    run("Warm-up", "1 km", "Easy"),
    {
      exercise: `${rounds} × (1 km run + station)`,
      sets: rounds,
      reps: "1 km + station",
      kind: "time",
      note: "Alternate stations: sled push, sled pull, burpee broad jumps, farmers carry, wall balls",
    },
  ],
  withPartner: true,
});

// ----------------------------------------------------- weeks 1-19 by day --

/**
 * ISO weekday: 1 = Monday ... 7 = Sunday.
 * `week` is 1-based. Week 20's non-race-block days reuse week 19's deload.
 */
export function weekdayTemplate(week: number, isoWeekday: number): SessionTemplate {
  const isBuildOrLater = week >= 9;

  switch (isoWeekday) {
    case 1:
      return lowerHyrox();

    case 2:
      if (!isBuildOrLater) return easyRun(week <= 4 ? 5 : 6);
      // Weeks 9-16 ramp 5 -> 6 reps; peak and taper weeks hold at 5.
      return intervals(week >= 13 && week <= 16 ? 6 : 5);

    case 3:
      return upper();

    case 4:
      return swimOrPickleball();

    case 5:
      if (!isBuildOrLater) return fullBodyCircuit();
      return partnerHyrox(week >= 13 ? 4 : 3);

    case 6:
      if (week === 17) {
        return {
          type: "race_simulation",
          title: "Full race simulation",
          planned: [
            {
              exercise: "Full Hyrox doubles simulation",
              sets: 1,
              reps: "8 × (1 km + station)",
              kind: "time",
              note: "Run it as a dress rehearsal: race kit, race fuelling, race pacing.",
            },
          ],
          withPartner: true,
        };
      }
      if (week === 18) {
        return {
          type: "half_simulation",
          title: "Half race simulation",
          planned: [
            {
              exercise: "Half Hyrox doubles simulation",
              sets: 1,
              reps: "4 × (1 km + station)",
              kind: "time",
              note: "Race pace, half the distance. Should feel controlled.",
            },
          ],
          withPartner: true,
        };
      }
      // 8 km in week 1, building half a km a week, capped at 12.
      return longRun(Math.min(8 + (week - 1) * 0.5, 12));

    default:
      return restDay();
  }
}

// ------------------------------------------------------ race week by offset --

/**
 * `daysOut` is how many days before the race this session falls (0 = race day).
 * The six days the plan calls for sit at offsets 5 down to 0; the two days in
 * front of them are a shakeout and a rest so the block fills a whole week.
 */
export function raceWeekTemplate(daysOut: number): SessionTemplate {
  switch (daysOut) {
    case 7:
      return {
        type: "easy_run",
        title: "Easy shakeout",
        planned: [run("Easy run", "5 km", "Relaxed — legs should feel better after, not worse")],
      };
    case 6:
      return { type: "rest", title: "Rest", planned: [] };
    case 5:
      return {
        type: "light_lift",
        title: "Light lift",
        planned: [
          w("Back squat", 3, "5", "~60% of your working weight"),
          w("Bench press", 2, "5", "Light"),
          bw("Pull-ups", 2, "5", "Stop well short of failure"),
        ],
        notes: "Move some weight to stay sharp. Nothing here should be hard.",
      };
    case 4:
      return {
        type: "intervals",
        title: "Intervals — 3 × 1 km",
        planned: [
          run("Warm-up", "1.5 km", "Easy"),
          run("3 × 1 km at race pace", "3 × 1 km", "90 s rest between reps"),
          run("Cool-down", "1 km", "Easy"),
        ],
      };
    case 3:
      return { type: "swim_pickleball", title: "Swim or rest", planned: [] };
    case 2:
      return {
        type: "jog_strides",
        title: "20-min jog + strides",
        planned: [
          run("Easy jog", "20 min", "Very easy"),
          run("Strides", "4 × 20 s", "Fast but relaxed, full recovery between"),
        ],
      };
    case 1:
      return {
        type: "rest",
        title: "Rest",
        planned: [],
        notes: "Feet up. Eat well, hydrate, lay your kit out tonight.",
      };
    default:
      return {
        type: "race",
        title: "HYROX Doubles — Race Day",
        planned: [],
        withPartner: true,
        notes: "Twenty weeks for this one. Go get it.",
      };
  }
}

// ----------------------------------------------------------------- volume --

/** Week 19 drops volume ~30% while keeping the intensity the same. */
export function scaleVolume(planned: PlannedExercise[], factor: number): PlannedExercise[] {
  return planned.map((p) => {
    if (p.kind === "run") {
      const km = p.reps.match(/^([\d.]+) km$/);
      if (km) {
        const scaled = Math.round(parseFloat(km[1]) * factor * 2) / 2;
        return { ...p, reps: `${scaled} km` };
      }
      const reps = p.reps.match(/^(\d+) × 1 km$/);
      if (reps) {
        const scaled = Math.max(1, Math.round(parseInt(reps[1], 10) * factor));
        return { ...p, reps: `${scaled} × 1 km`, sets: scaled };
      }
      return p;
    }
    return { ...p, sets: Math.max(1, Math.round(p.sets * factor)) };
  });
}
