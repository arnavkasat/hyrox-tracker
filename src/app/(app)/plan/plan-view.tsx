"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronRight, Pencil } from "lucide-react";

import { Calendar } from "./calendar";
import { SessionEditor } from "./session-editor";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { addDays, formatLongDate, isoWeekday, weekdayLabel, type ISODate } from "@/lib/date";
import { GROUP_DOT, GROUP_LABEL, GROUP_TEXT, TYPE_META, groupOf } from "@/lib/plan/appearance";
import type { PlanSession } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const LEGEND = ["strength", "run", "hyrox", "recovery", "rest"] as const;

export function PlanView({
  sessions,
  today,
}: {
  sessions: PlanSession[];
  today: ISODate;
}) {
  const byDate = useMemo(
    () => new Map(sessions.map((s) => [s.date, s])),
    [sessions],
  );

  // Land on today if it's in the plan, otherwise on the first planned day.
  const initial = byDate.has(today) ? today : (sessions[0]?.date ?? today);

  const [selected, setSelected] = useState<ISODate>(initial);
  const [month, setMonth] = useState<ISODate>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const weekStart = addDays(selected, -(isoWeekday(selected) - 1));
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        .map((date) => byDate.get(date))
        .filter((s): s is PlanSession => Boolean(s)),
    [weekStart, byDate],
  );

  const current = byDate.get(selected) ?? null;

  function openDay(date: ISODate) {
    setSelected(date);
    if (byDate.has(date)) {
      setEditing(false);
      setOpen(true);
    }
  }

  return (
    <>
      <Calendar
        month={month}
        onMonthChange={setMonth}
        sessions={byDate}
        selected={selected}
        onSelect={(date) => {
          setSelected(date);
          openDay(date);
        }}
        today={today}
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {LEGEND.map((group) => (
          <span key={group} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", GROUP_DOT[group])} />
            {GROUP_LABEL[group]}
          </span>
        ))}
      </div>

      {/* ------------------------------------------------- selected week -- */}
      <section>
        <h2 className="px-4 pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          {week.length > 0 ? `Week ${week[0].week} of 20` : "This week"}
        </h2>

        <div className="surface overflow-hidden rounded-2xl [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-x-0 [&>*+*]:before:top-0 [&>*+*]:before:ml-4 [&>*+*]:before:h-px [&>*+*]:before:bg-hairline">
          {week.map((session) => {
            const group = groupOf(session.type);
            return (
              <button
                key={session.date}
                type="button"
                onClick={() => openDay(session.date)}
                className={cn(
                  "press flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left",
                  session.date === today && "bg-white/[0.04]",
                )}
              >
                <span className="w-9 shrink-0">
                  <span className="block text-[11px] text-muted-foreground">
                    {weekdayLabel(session.date)}
                  </span>
                  <span
                    className={cn(
                      "block text-[15px] font-semibold",
                      session.date === today && "text-primary",
                    )}
                  >
                    {session.date.slice(8)}
                  </span>
                </span>

                <span className={cn("size-2 shrink-0 rounded-full", GROUP_DOT[group])} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px]">{session.title}</span>
                  <span className={cn("block text-[13px]", GROUP_TEXT[group])}>
                    {TYPE_META[session.type]?.label ?? session.type}
                    {session.with_partner ? " · partner" : ""}
                    {session.origin !== "generated" ? " · edited" : ""}
                  </span>
                </span>

                {session.status === "completed" ? (
                  <Check className="size-5 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- day sheet -- */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto pb-safe">
            {current ? (
              <>
                <DrawerHeader className="text-left">
                  <DrawerTitle className="text-[22px]">{current.title}</DrawerTitle>
                  <DrawerDescription>
                    {formatLongDate(current.date)} · Week {current.week}
                  </DrawerDescription>
                </DrawerHeader>

                {editing ? (
                  <SessionEditor
                    key={current.date}
                    session={current}
                    onDone={() => {
                      setEditing(false);
                      setOpen(false);
                    }}
                  />
                ) : (
                  <div className="space-y-5 px-4 pb-6">
                    {current.planned.length > 0 ? (
                      <ul className="surface divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl">
                        {current.planned.map((exercise, i) => (
                          <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[17px]">
                                {exercise.exercise}
                              </span>
                              {exercise.note ? (
                                <span className="block text-[13px] text-muted-foreground">
                                  {exercise.note}
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-[15px] text-muted-foreground">
                              {exercise.kind === "run"
                                ? exercise.reps
                                : `${exercise.sets} × ${exercise.reps}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="surface rounded-2xl px-4 py-5 text-center text-[15px] text-muted-foreground">
                        {current.notes ?? "Rest day. Nothing scheduled."}
                      </p>
                    )}

                    {current.notes && current.planned.length > 0 ? (
                      <p className="px-1 text-[13px] text-muted-foreground">{current.notes}</p>
                    ) : null}

                    <div className="space-y-2">
                      {current.date > today ? (
                        // Nothing to log until it has happened.
                        <p className="surface rounded-2xl px-4 py-3 text-center text-[13px] text-muted-foreground">
                          Logging opens on {formatLongDate(current.date)}.
                        </p>
                      ) : current.status !== "completed" && current.type !== "rest" ? (
                        <Button asChild variant="brand" size="ios" className="w-full">
                          <Link href={`/train?date=${current.date}`}>
                            {current.date === today ? "Start session" : "Log this session"}
                          </Link>
                        </Button>
                      ) : null}

                      <Button
                        variant="glass"
                        size="ios"
                        className="w-full"
                        onClick={() => setEditing(true)}
                      >
                        <Pencil className="size-4" />
                        Edit session
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-[15px] text-muted-foreground">
                  Nothing planned for this day.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
