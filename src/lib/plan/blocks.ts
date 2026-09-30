/**
 * The building blocks the session editor offers.
 *
 * Presets replace a whole day; blocks are single exercises you add to one.
 * Both produce ordinary `PlannedExercise` values, so anything you build by
 * hand is indistinguishable from anything the generator made.
 */

import type { PlannedExercise, SessionType } from "@/lib/plan/template";

export type Block = {
  exercise: string;
  kind: PlannedExercise["kind"];
  sets: number;
  reps: string;
  category: string;
};

export const BLOCK_CATEGORIES = [
  "Legs",
  "Push",
  "Pull",
  "Arms",
  "Hyrox stations",
  "Carries & core",
  "Running",
  "Recovery",
] as const;

export const BLOCKS: Block[] = [
  // Legs
  { exercise: "Back squat", kind: "weight", sets: 4, reps: "5-8", category: "Legs" },
  { exercise: "Front squat", kind: "weight", sets: 4, reps: "5-8", category: "Legs" },
  { exercise: "Deadlift", kind: "weight", sets: 3, reps: "5", category: "Legs" },
  { exercise: "Romanian deadlift", kind: "weight", sets: 3, reps: "8", category: "Legs" },
  { exercise: "Bulgarian split squat", kind: "weight", sets: 3, reps: "10", category: "Legs" },
  { exercise: "Leg press", kind: "weight", sets: 3, reps: "10-12", category: "Legs" },
  { exercise: "Walking lunges", kind: "carry", sets: 3, reps: "20 steps", category: "Legs" },
  { exercise: "Calf raises", kind: "weight", sets: 3, reps: "15", category: "Legs" },

  // Push
  { exercise: "Bench press", kind: "weight", sets: 3, reps: "6-8", category: "Push" },
  { exercise: "Incline DB press", kind: "weight", sets: 3, reps: "8-10", category: "Push" },
  { exercise: "Overhead press", kind: "weight", sets: 3, reps: "6-8", category: "Push" },
  { exercise: "DB shoulder press", kind: "weight", sets: 3, reps: "8-10", category: "Push" },
  { exercise: "Lateral raises", kind: "weight", sets: 3, reps: "12-15", category: "Push" },
  { exercise: "Dips", kind: "bodyweight", sets: 3, reps: "AMRAP", category: "Push" },
  { exercise: "Push-ups", kind: "bodyweight", sets: 3, reps: "AMRAP", category: "Push" },

  // Pull
  { exercise: "Pull-ups", kind: "bodyweight", sets: 4, reps: "AMRAP", category: "Pull" },
  { exercise: "Chin-ups", kind: "bodyweight", sets: 3, reps: "AMRAP", category: "Pull" },
  { exercise: "Lat pulldown", kind: "weight", sets: 3, reps: "8-10", category: "Pull" },
  { exercise: "Seated row", kind: "weight", sets: 3, reps: "10", category: "Pull" },
  { exercise: "Barbell row", kind: "weight", sets: 3, reps: "8", category: "Pull" },
  { exercise: "Face pulls", kind: "weight", sets: 3, reps: "15", category: "Pull" },

  // Arms
  { exercise: "Biceps curls", kind: "weight", sets: 3, reps: "10-12", category: "Arms" },
  { exercise: "Hammer curls", kind: "weight", sets: 3, reps: "10-12", category: "Arms" },
  { exercise: "Tricep pushdowns", kind: "weight", sets: 3, reps: "10-12", category: "Arms" },
  { exercise: "Overhead tricep extension", kind: "weight", sets: 3, reps: "10-12", category: "Arms" },

  // Hyrox stations — the eight, in race order
  { exercise: "SkiErg", kind: "time", sets: 1, reps: "1000 m", category: "Hyrox stations" },
  { exercise: "Sled push", kind: "carry", sets: 1, reps: "50 m", category: "Hyrox stations" },
  { exercise: "Sled pull", kind: "carry", sets: 1, reps: "50 m", category: "Hyrox stations" },
  { exercise: "Burpee broad jumps", kind: "bodyweight", sets: 1, reps: "80 m", category: "Hyrox stations" },
  { exercise: "Rowing", kind: "time", sets: 1, reps: "1000 m", category: "Hyrox stations" },
  { exercise: "Farmers carry", kind: "carry", sets: 3, reps: "40 m", category: "Hyrox stations" },
  { exercise: "Sandbag lunges", kind: "carry", sets: 1, reps: "100 m", category: "Hyrox stations" },
  { exercise: "Wall balls", kind: "weight", sets: 3, reps: "20", category: "Hyrox stations" },

  // Carries & core
  { exercise: "Suitcase carry", kind: "carry", sets: 3, reps: "40 m", category: "Carries & core" },
  { exercise: "Plank", kind: "time", sets: 3, reps: "60 s", category: "Carries & core" },
  { exercise: "Hanging leg raises", kind: "bodyweight", sets: 3, reps: "12", category: "Carries & core" },
  { exercise: "Ab wheel", kind: "bodyweight", sets: 3, reps: "10", category: "Carries & core" },

  // Running
  { exercise: "Easy run", kind: "run", sets: 1, reps: "5 km", category: "Running" },
  { exercise: "Long run", kind: "run", sets: 1, reps: "12 km", category: "Running" },
  { exercise: "Warm-up", kind: "run", sets: 1, reps: "1.5 km", category: "Running" },
  { exercise: "Cool-down", kind: "run", sets: 1, reps: "1 km", category: "Running" },
  { exercise: "5 × 1 km at race pace", kind: "run", sets: 5, reps: "5 × 1 km", category: "Running" },
  { exercise: "Strides", kind: "run", sets: 1, reps: "4 × 20 s", category: "Running" },
  { exercise: "Tempo run", kind: "run", sets: 1, reps: "6 km", category: "Running" },

  // Recovery
  { exercise: "Swim", kind: "time", sets: 1, reps: "30 min", category: "Recovery" },
  { exercise: "Pickleball", kind: "time", sets: 1, reps: "Easy", category: "Recovery" },
  { exercise: "Mobility", kind: "time", sets: 1, reps: "15 min", category: "Recovery" },
  { exercise: "Zone 2 bike", kind: "time", sets: 1, reps: "40 min", category: "Recovery" },
];

export type Preset = {
  id: string;
  title: string;
  type: SessionType;
  withPartner?: boolean;
  planned: PlannedExercise[];
};

const block = (name: string, overrides: Partial<PlannedExercise> = {}): PlannedExercise => {
  const found = BLOCKS.find((b) => b.exercise === name);
  if (!found) throw new Error(`Unknown block: ${name}`);
  return {
    exercise: found.exercise,
    kind: found.kind,
    sets: found.sets,
    reps: found.reps,
    ...overrides,
  };
};

/** Whole-day starting points. Picking one replaces the session's exercises. */
export const PRESETS: Preset[] = [
  {
    id: "lower_hyrox",
    title: "Lower + Hyrox",
    type: "lower_hyrox",
    planned: [
      block("Back squat"),
      block("Romanian deadlift"),
      block("Walking lunges"),
      block("Wall balls"),
    ],
  },
  {
    id: "upper",
    title: "Upper",
    type: "upper",
    planned: [
      block("Pull-ups"),
      block("Incline DB press"),
      block("Seated row"),
      block("DB shoulder press"),
      block("Lateral raises"),
      block("Biceps curls"),
      block("Tricep pushdowns"),
      block("Farmers carry"),
    ],
  },
  {
    id: "full_body_circuit",
    title: "Full body + circuit",
    type: "full_body_circuit",
    planned: [
      block("Bench press"),
      block("Lat pulldown"),
      block("Hammer curls"),
      block("Overhead tricep extension"),
      {
        exercise: "Circuit: row, sled, lunges",
        kind: "time",
        sets: 1,
        reps: "15-20 min",
      },
    ],
  },
  {
    id: "easy_run",
    title: "Easy run",
    type: "easy_run",
    planned: [block("Easy run", { note: "5:45-6:15 / km" })],
  },
  {
    id: "intervals",
    title: "Intervals",
    type: "intervals",
    planned: [
      block("Warm-up"),
      block("5 × 1 km at race pace", { note: "90 s rest between reps" }),
      block("Cool-down"),
    ],
  },
  {
    id: "long_run",
    title: "Long easy run",
    type: "long_run",
    withPartner: true,
    planned: [block("Long run", { note: "Conversational pace" })],
  },
  {
    id: "partner_hyrox",
    title: "Partner Hyrox",
    type: "partner_hyrox",
    withPartner: true,
    planned: [
      block("Warm-up", { reps: "1 km" }),
      {
        exercise: "4 × (1 km run + station)",
        kind: "time",
        sets: 4,
        reps: "1 km + station",
        note: "Alternate stations each round",
      },
    ],
  },
  {
    id: "swim_pickleball",
    title: "Swim or pickleball",
    type: "swim_pickleball",
    planned: [block("Swim")],
  },
  { id: "rest", title: "Rest", type: "rest", planned: [] },
];
