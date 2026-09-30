"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDays, isoWeekday, parseISODate, toISODate, type ISODate } from "@/lib/date";
import { GROUP_DOT, groupOf } from "@/lib/plan/appearance";
import type { PlanSession } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Month grid. Days outside the plan are shown but not selectable. */
export function Calendar({
  month,
  onMonthChange,
  sessions,
  selected,
  onSelect,
  today,
}: {
  /** Any date inside the month being shown. */
  month: ISODate;
  onMonthChange: (next: ISODate) => void;
  sessions: Map<ISODate, PlanSession>;
  selected: ISODate;
  onSelect: (date: ISODate) => void;
  today: ISODate;
}) {
  const first = startOfMonth(month);
  const gridStart = addDays(first, -(isoWeekday(first) - 1));

  const days: ISODate[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));

  // Trim a trailing all-blank week so short months don't leave a gap.
  const weeks: ISODate[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  while (weeks.length > 4 && weeks[weeks.length - 1].every((d) => !sameMonth(d, month))) {
    weeks.pop();
  }

  return (
    <div className="surface rounded-2xl p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>

        <span className="text-[17px] font-semibold">{monthLabel(month)}</span>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 pb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {weeks.flat().map((date) => {
          const session = sessions.get(date);
          const inMonth = sameMonth(date, month);
          const isSelected = date === selected;
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              disabled={!session}
              onClick={() => onSelect(date)}
              aria-label={session ? `${date}: ${session.title}` : date}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "press relative flex h-11 flex-col items-center justify-center gap-1 rounded-lg",
                !inMonth && "opacity-35",
                !session && "opacity-25",
                isSelected && "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[13px] leading-none",
                  isToday && "ember font-bold text-primary-foreground",
                  !isToday && isSelected && "font-semibold",
                )}
              >
                {parseISODate(date).getUTCDate()}
              </span>

              <span
                className={cn(
                  "size-1.5 rounded-full",
                  session ? GROUP_DOT[groupOf(session.type)] : "bg-transparent",
                  session?.status === "completed" && "ring-2 ring-white/30",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

function sameMonth(a: ISODate, b: ISODate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

function shiftMonth(date: ISODate, delta: number): ISODate {
  const d = parseISODate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + delta);
  return toISODate(d);
}

function monthLabel(date: ISODate): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseISODate(date));
}
