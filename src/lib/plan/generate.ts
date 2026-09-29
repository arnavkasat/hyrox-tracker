/**
 * Turns the template into dated sessions.
 *
 * The grid is anchored to **race day**, not to the training start date, so
 * the taper always lands correctly and the plan stays right if the race
 * date is ever edited. Weeks run Monday-Sunday; week 20 is the race block.
 */

import {
  addDays,
  diffDays,
  isoWeekday,
  mondayOnOrBefore,
  type ISODate,
} from "@/lib/date";
import {
  RACE_BLOCK_DAYS,
  TOTAL_WEEKS,
  phaseForWeek,
  raceWeekTemplate,
  scaleVolume,
  weekdayTemplate,
  type Phase,
  type PlannedExercise,
  type SessionType,
} from "@/lib/plan/template";

export type GeneratedSession = {
  date: ISODate;
  week: number;
  phase: Phase;
  type: SessionType;
  title: string;
  planned: PlannedExercise[];
  with_partner: boolean;
  notes: string | null;
};

export type PlanBounds = {
  /** Monday of week 1. */
  week1Monday: ISODate;
  /** Monday of week 20 — the start of the race block's calendar week. */
  week20Monday: ISODate;
  /** First day of the race-week taper block. */
  raceBlockStart: ISODate;
};

/** Where the 20-week grid sits, given a race date. */
export function planBounds(raceDate: ISODate): PlanBounds {
  const raceBlockStart = addDays(raceDate, -RACE_BLOCK_DAYS);
  const week20Monday = mondayOnOrBefore(raceBlockStart);
  return {
    raceBlockStart,
    week20Monday,
    week1Monday: addDays(week20Monday, -(TOTAL_WEEKS - 1) * 7),
  };
}

/** Which plan week a date falls in. Clamped to 1..20. */
export function weekForDate(date: ISODate, raceDate: ISODate): number {
  const { week1Monday } = planBounds(raceDate);
  const week = Math.floor(diffDays(week1Monday, date) / 7) + 1;
  return Math.min(TOTAL_WEEKS, Math.max(1, week));
}

export function generatePlan(opts: {
  raceDate: ISODate;
  trainingStartDate: ISODate;
}): GeneratedSession[] {
  const { raceDate, trainingStartDate } = opts;
  const { week1Monday, raceBlockStart } = planBounds(raceDate);

  // Never generate sessions before the athlete actually starts training.
  const firstDay = trainingStartDate > week1Monday ? trainingStartDate : week1Monday;

  const sessions: GeneratedSession[] = [];

  for (let date = firstDay; date <= raceDate; date = addDays(date, 1)) {
    const week = weekForDate(date, raceDate);
    const daysOut = diffDays(date, raceDate);

    const inRaceBlock = date >= raceBlockStart;
    const template = inRaceBlock
      ? raceWeekTemplate(daysOut)
      : weekdayTemplate(week, isoWeekday(date));

    // Week 19 is the deload: same intensity, ~30% less volume.
    const planned =
      !inRaceBlock && week === 19 ? scaleVolume(template.planned, 0.7) : template.planned;

    sessions.push({
      date,
      week,
      phase: inRaceBlock ? "race" : phaseForWeek(week),
      type: template.type,
      title: template.title,
      planned,
      with_partner: template.withPartner ?? false,
      notes: template.notes ?? null,
    });
  }

  return sessions;
}
