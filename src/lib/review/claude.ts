/**
 * The written half of the weekly review.
 *
 * The rules in rules.ts have already decided what changes. This asks Claude
 * for the part a rule can't write: a short read on how the week actually
 * went, and a plain-English reason for each change.
 *
 * It is given the week's numbers and asked not to produce any of its own.
 * Structured output means the response either matches the schema or fails
 * loudly, rather than arriving as prose nobody can parse.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { formatPace } from "@/lib/date";
import type { ProposedChange } from "@/lib/review/rules";
import type { WeekStats } from "@/lib/review/stats";

/**
 * The brief named "Sonnet 5". Claude Sonnet 5.5 is the current model in
 * that tier at identical pricing, so it's used here; pin the older id if
 * you ever need to reproduce an old review exactly.
 */
const MODEL = "claude-sonnet-5-5";

const ReviewSchema = z.object({
  headline: z
    .string()
    .describe("One sentence on how the week went. Direct, no cheerleading."),
  summary: z
    .string()
    .describe(
      "Two or three short paragraphs: what happened, what stands out, what to watch. Plain text, no markdown.",
    ),
  change_notes: z
    .array(
      z.object({
        id: z.string().describe("The id of the change this explains, copied exactly."),
        note: z
          .string()
          .describe("One sentence on why this change makes sense for this athlete."),
      }),
    )
    .describe("One entry per proposed change. Do not invent changes."),
});

export type ReviewText = z.infer<typeof ReviewSchema>;

const SYSTEM = `You write the weekly review for one athlete's HYROX doubles training tracker.

You are given the week's numbers and a list of changes that have already been
decided by deterministic rules. Your job is the writing, not the programming.

Rules:
- Use only the numbers you are given. Never estimate, extrapolate or invent one.
- Do not propose changes. A list is supplied; write one note per entry, keyed by id.
- Be direct and specific. "Three of six sessions" beats "a few sessions".
- No cheerleading, no exclamation marks, no emoji, no markdown.
- If the week was poor, say so plainly and without lecturing.
- You are not a doctor. Do not diagnose anything or give medical advice.
- Address the athlete as "you".`;

function describe(stats: WeekStats, changes: ProposedChange[]): string {
  const lines: string[] = [];
  const n = (v: number | null, digits = 1) => (v == null ? "no data" : v.toFixed(digits));

  lines.push(`Week ${stats.week} (${stats.weekStart} to ${stats.weekEnd})`);
  lines.push(`Days until race: ${stats.daysToRace}`);
  lines.push("");
  lines.push(
    `Sessions: ${stats.sessionsCompleted} of ${stats.sessionsPlanned} completed (${Math.round(
      stats.completionRate * 100,
    )}%)`,
  );
  lines.push(`Sets logged: ${stats.setsCompleted}`);
  lines.push("");
  lines.push(`Check-ins: ${stats.checkinsLogged} of 7`);
  lines.push(`Average readiness: ${stats.averageReadiness ?? "no data"} out of 100`);
  lines.push(`Average weight: ${n(stats.averageWeight)} kg`);
  lines.push(
    `Weight change vs last week: ${
      stats.weightChange == null
        ? "no data"
        : `${stats.weightChange > 0 ? "+" : ""}${stats.weightChange.toFixed(2)} kg`
    }`,
  );
  lines.push(`Average sleep: ${n(stats.averageSleep)} hours`);
  lines.push(`Average resting heart rate: ${n(stats.averageRestingHr, 0)} bpm`);
  lines.push(`Average HRV: ${n(stats.averageHrv, 0)} ms`);
  lines.push("");

  if (stats.runs.length > 0) {
    lines.push(
      `Runs: ${stats.runs.length}, averaging ${formatPace(stats.averagePaceSec!)} per km`,
    );
    for (const run of stats.runs) {
      lines.push(`  ${run.date}: ${run.km.toFixed(1)} km at ${formatPace(run.paceSec)}/km`);
    }
  } else {
    lines.push("Runs: none recorded");
  }
  lines.push("");

  if (stats.exercises.length > 0) {
    lines.push("Exercises worked:");
    for (const e of stats.exercises) {
      lines.push(
        `  ${e.exercise}: ${e.sets} sets` +
          (e.topWeight != null ? `, top ${e.topWeight} kg` : "") +
          (e.topReps != null ? ` x ${e.topReps}` : "") +
          (e.cleanSweep ? " (every set at the top of the range)" : ""),
      );
    }
  } else {
    lines.push("Exercises worked: none logged");
  }
  lines.push("");

  if (changes.length > 0) {
    lines.push("Changes already decided by the rules — write one note per id:");
    for (const c of changes) {
      lines.push(`  id: ${c.id}`);
      lines.push(`    change: ${c.title}`);
      lines.push(`    rule's reason: ${c.reason}`);
    }
  } else {
    lines.push("No changes were triggered this week. change_notes must be empty.");
  }

  return lines.join("\n");
}

export async function writeReview(
  stats: WeekStats,
  changes: ProposedChange[],
): Promise<ReviewText> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    // The week's facts are small and the writing is short; the default
    // effort would spend more thinking than this is worth.
    output_config: { effort: "low", format: zodOutputFormat(ReviewSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: describe(stats, changes) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The model declined to write this review.");
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("The model's response did not match the review schema.");
  }

  // The model is told not to invent changes; this makes sure it didn't.
  const known = new Set(changes.map((c) => c.id));
  return {
    ...parsed,
    change_notes: parsed.change_notes.filter((note) => known.has(note.id)),
  };
}
