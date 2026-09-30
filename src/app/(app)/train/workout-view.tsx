"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SetRowItem } from "./set-row";
import { finishSession, setWithPartner, startSession, upsertSetLog } from "./actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RestTimer } from "@/components/ios/rest-timer";
import { groupByExercise, type SetRow } from "@/lib/plan/sets";
import type { PlanSession } from "@/lib/supabase/types";

/** Default rest between working sets. */
const REST_SECONDS = 90;

/** Lifts get a rest timer; runs and circuits are self-paced. */
const RESTS_BETWEEN_SETS = new Set(["weight", "bodyweight", "carry"]);

/** Kept out of the component so the compiler doesn't read clock reads in
 *  event handlers as impure render work. */
const nowMs = () => Date.now();

export function WorkoutView({
  session,
  initialRows,
}: {
  session: PlanSession;
  initialRows: SetRow[];
}) {
  const router = useRouter();

  const [rows, setRows] = useState(initialRows);
  const [partner, setPartner] = useState(session.with_partner);
  const [finishing, setFinishing] = useState(false);

  // The set you're currently on, keyed "exercise#set".
  const [expanded, setExpanded] = useState<string | null>(() => {
    const next = initialRows.find((r) => !r.completed);
    return next ? keyOf(next) : null;
  });

  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(nowMs);

  useEffect(() => {
    if (restEndsAt === null) return;
    const id = setInterval(() => setNow(nowMs()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  // Stepper taps fire quickly; collapse them into one write per row.
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = saveTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const groups = useMemo(() => groupByExercise(rows), [rows]);
  const completedCount = rows.filter((r) => r.completed).length;

  async function save(row: SetRow) {
    try {
      await upsertSetLog({
        session_id: session.id,
        exercise: row.exercise,
        exercise_order: row.exercise_order,
        set_number: row.set_number,
        weight_kg: row.weight_kg,
        reps: row.reps,
        completed: row.completed,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save set");
    }
  }

  function patchRow(key: string, patch: Partial<SetRow>, saveNow: boolean) {
    let updated: SetRow | undefined;

    setRows((current) =>
      current.map((row) => {
        if (keyOf(row) !== key) return row;
        updated = { ...row, ...patch };
        return updated;
      }),
    );

    if (!updated) return;
    const next = updated;

    const existing = saveTimers.current.get(key);
    if (existing) clearTimeout(existing);

    if (saveNow) {
      saveTimers.current.delete(key);
      void save(next);
    } else {
      saveTimers.current.set(
        key,
        setTimeout(() => {
          saveTimers.current.delete(key);
          void save(next);
        }, 600),
      );
    }
  }

  function toggle(row: SetRow) {
    const key = keyOf(row);
    const completed = !row.completed;

    patchRow(key, { completed }, true);

    if (session.status === "planned") void startSession(session.id);

    if (completed) {
      if (RESTS_BETWEEN_SETS.has(row.kind)) {
        const startedAt = nowMs();
        setNow(startedAt);
        setRestEndsAt(startedAt + REST_SECONDS * 1000);
      }
      // Move focus to the next unfinished set.
      const next = rows.find((r) => !r.completed && keyOf(r) !== key);
      setExpanded(next ? keyOf(next) : null);
    } else {
      setExpanded(key);
    }
  }

  async function onFinish() {
    setFinishing(true);
    try {
      await finishSession(session.id);
      toast.success("Session logged");
      router.push("/today");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not finish");
      setFinishing(false);
    }
  }

  const secondsLeft =
    restEndsAt === null ? 0 : Math.max(0, Math.ceil((restEndsAt - now) / 1000));

  return (
    <>
      <div className="space-y-6">
        {/* ------------------------------------------------ session meta -- */}
        <div className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-medium">With partner</p>
              <p className="text-[13px] text-muted-foreground">
                Logged on the session for the weekly review.
              </p>
            </div>
            <Switch
              checked={partner}
              onCheckedChange={(checked) => {
                setPartner(checked);
                void setWithPartner(session.id, checked);
              }}
              aria-label="Training with partner"
            />
          </div>

          {rows.length > 0 ? (
            <>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="brand-fill h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${(completedCount / rows.length) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {completedCount} of {rows.length} sets done
              </p>
            </>
          ) : null}
        </div>

        {/* ---------------------------------------------------- exercises -- */}
        {groups.map(({ exercise, rows: setRows }) => (
          <section key={exercise}>
            <div className="flex items-baseline justify-between gap-3 px-4 pb-2">
              <h2 className="min-w-0 truncate text-[17px] font-semibold">{exercise}</h2>
              <span className="shrink-0 text-[13px] text-muted-foreground">
                {setRows.length > 1 ? `${setRows.length} × ` : ""}
                {setRows[0].target}
              </span>
            </div>

            <div className="surface overflow-hidden rounded-2xl [&>*+*]:relative [&>*+*]:before:absolute [&>*+*]:before:inset-x-0 [&>*+*]:before:top-0 [&>*+*]:before:ml-4 [&>*+*]:before:h-px [&>*+*]:before:bg-hairline">
              {setRows.map((row) => (
                <SetRowItem
                  key={keyOf(row)}
                  row={row}
                  expanded={expanded === keyOf(row)}
                  onExpand={() => setExpanded(expanded === keyOf(row) ? null : keyOf(row))}
                  onChange={(patch) => patchRow(keyOf(row), patch, false)}
                  onToggle={() => toggle(row)}
                />
              ))}
            </div>

            {setRows[0].note ? (
              <p className="px-4 pt-2 text-[13px] leading-snug text-muted-foreground">
                {setRows[0].note}
              </p>
            ) : null}
          </section>
        ))}

        <Button
          onClick={onFinish}
          disabled={finishing}
          variant="brand"
          size="ios"
          className="w-full"
        >
          {finishing ? "Saving…" : "Finish session"}
        </Button>
      </div>

      {restEndsAt !== null ? (
        <RestTimer
          secondsLeft={secondsLeft}
          onAdd={() => setRestEndsAt((end) => (end ?? nowMs()) + 30_000)}
          onDismiss={() => setRestEndsAt(null)}
        />
      ) : null}
    </>
  );
}

function keyOf(row: SetRow): string {
  return `${row.exercise}#${row.set_number}`;
}
