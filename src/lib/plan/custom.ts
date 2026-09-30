/**
 * Generating a plan from a template you designed, instead of the built-in
 * Hyrox block.
 *
 * The shape is deliberately small: a session for each weekday, plus optional
 * "from week N, this weekday changes" overrides. That covers "every Monday I
 * squat, and from week 9 Tuesdays become intervals" without turning into a
 * scripting language.
 */

import { addDays, isoWeekday, type ISODate } from "@/lib/date";
import { planBounds, weekForDate, type GeneratedSession } from "@/lib/plan/generate";
import { phaseForWeek, type PlannedExercise, type SessionType } from "@/lib/plan/template";

export type DayTemplate = {
  title: string;
  type: SessionType;
  planned: PlannedExercise[];
  withPartner: boolean;
};

export type PhaseOverride = {
  /** Applies from this plan week onwards. */
  fromWeek: number;
  /** 1 = Monday ... 7 = Sunday. */
  weekday: number;
  day: DayTemplate;
};

export type WeeklyTemplate = {
  /** Keyed "1".."7". A null day is a rest day. */
  days: Record<string, DayTemplate | null>;
  overrides: PhaseOverride[];
};

export const REST_DAY: DayTemplate = {
  title: "Rest",
  type: "rest",
  planned: [],
  withPartner: false,
};

export function emptyTemplate(): WeeklyTemplate {
  return {
    days: { "1": null, "2": null, "3": null, "4": null, "5": null, "6": null, "7": null },
    overrides: [],
  };
}

/** The day that applies for a given weekday in a given week. */
export function dayFor(
  template: WeeklyTemplate,
  week: number,
  weekday: number,
): DayTemplate | null {
  // The latest override at or before this week wins.
  const applicable = template.overrides
    .filter((o) => o.weekday === weekday && week >= o.fromWeek)
    .sort((a, b) => a.fromWeek - b.fromWeek)
    .at(-1);

  if (applicable) return applicable.day;
  return template.days[String(weekday)] ?? null;
}

export function generateFromTemplate(opts: {
  raceDate: ISODate;
  trainingStartDate: ISODate;
  template: WeeklyTemplate;
}): GeneratedSession[] {
  const { raceDate, trainingStartDate, template } = opts;
  const { week1Monday } = planBounds(raceDate);

  const firstDay = trainingStartDate > week1Monday ? trainingStartDate : week1Monday;
  const sessions: GeneratedSession[] = [];

  for (let date = firstDay; date <= raceDate; date = addDays(date, 1)) {
    const week = weekForDate(date, raceDate);

    // Race day is race day whatever the template says.
    if (date === raceDate) {
      sessions.push({
        date,
        week,
        phase: "race",
        type: "race",
        title: "Race Day",
        planned: [],
        with_partner: true,
        notes: null,
      });
      continue;
    }

    const day = dayFor(template, week, isoWeekday(date)) ?? REST_DAY;

    sessions.push({
      date,
      week,
      phase: phaseForWeek(week),
      type: day.type,
      title: day.title,
      planned: day.planned,
      with_partner: day.withPartner,
      notes: null,
    });
  }

  return sessions;
}

/** Rough weekly load, shown in the builder so you can sanity-check a week. */
export function templateWeeklySets(template: WeeklyTemplate): number {
  return Object.values(template.days).reduce(
    (total, day) => total + (day?.planned.reduce((n, p) => n + p.sets, 0) ?? 0),
    0,
  );
}

export function templateRestDays(template: WeeklyTemplate): number {
  return Object.values(template.days).filter((d) => !d || d.planned.length === 0).length;
}
