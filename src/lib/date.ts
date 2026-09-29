/**
 * Calendar-date helpers.
 *
 * Every date in this app is a plain calendar day ("2027-02-15"), never an
 * instant. Parsing those strings with `new Date(s)` in local time causes
 * off-by-one-day bugs either side of midnight, so everything here goes
 * through UTC and only `today()` consults a timezone.
 */

export type ISODate = string; // YYYY-MM-DD

export function parseISODate(date: ISODate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: ISODate): number {
  return ((parseISODate(date).getUTCDay() + 6) % 7) + 1;
}

/** The Monday on or before `date`. */
export function mondayOnOrBefore(date: ISODate): ISODate {
  return addDays(date, -(isoWeekday(date) - 1));
}

/** Today's calendar date in the given IANA timezone. */
export function today(timeZone = "UTC"): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayLabel(date: ISODate): string {
  return WEEKDAY_LABELS[isoWeekday(date) - 1];
}

export function formatDayMonth(date: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseISODate(date));
}

/** "Monday 15 February" — used for large titles. */
export function formatLongDate(date: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parseISODate(date));
}

/** Seconds per km as "5:45". */
export function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
