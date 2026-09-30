"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

import { PRESS_SPRING, RELEASE_SPRING, TAP_SMALL } from "@/components/ios/motion";
import { Stepper } from "@/components/ios/stepper";
import { cn } from "@/lib/utils";
import { usesReps, usesWeight, type SetRow } from "@/lib/plan/sets";

/**
 * One set. The set you're currently on expands to show steppers; the rest
 * collapse to a summary line so a long session stays scannable.
 */
export function SetRowItem({
  row,
  expanded,
  onExpand,
  onChange,
  onToggle,
}: {
  row: SetRow;
  expanded: boolean;
  onExpand: () => void;
  onChange: (patch: Partial<SetRow>) => void;
  onToggle: () => void;
}) {
  const weight = usesWeight(row.kind);
  const reps = usesReps(row.kind);

  const summary = [
    weight && row.weight_kg !== null ? `${row.weight_kg} kg` : null,
    reps && row.reps !== null ? `× ${row.reps}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="px-4 py-2">
      <div className="flex min-h-[44px] items-center gap-3">
        <button
          type="button"
          onClick={onExpand}
          className="press flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="w-10 shrink-0 text-[13px] text-muted-foreground">
            Set {row.set_number}
          </span>
          <span
            className={cn(
              "truncate text-[17px]",
              row.completed ? "text-muted-foreground line-through" : "",
            )}
          >
            {summary || (row.completed ? "Done" : row.target)}
          </span>
        </button>

        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={`${row.completed ? "Undo" : "Complete"} set ${row.set_number}`}
          aria-pressed={row.completed}
          whileTap={TAP_SMALL}
          transition={PRESS_SPRING}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2",
            row.completed
              ? "brand-fill border-transparent text-primary-foreground shadow-[0_4px_14px_-4px_rgb(76_180_255/65%)]"
              : "border-white/20 text-transparent",
          )}
        >
          {/* A completed set pops slightly past full size and settles —
              the small reward for finishing one. */}
          <motion.span
            animate={{ scale: row.completed ? 1 : 0.6 }}
            transition={RELEASE_SPRING}
          >
            <Check className="size-5" strokeWidth={3} />
          </motion.span>
        </motion.button>
      </div>

      {expanded && (weight || reps) ? (
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 pl-[3.25rem]">
          {weight ? (
            <Stepper
              value={row.weight_kg ?? 0}
              onChange={(weight_kg) => onChange({ weight_kg })}
              step={2.5}
              decimals={1}
              max={400}
              suffix="kg"
              label="weight"
            />
          ) : null}
          {reps ? (
            <Stepper
              value={row.reps ?? 0}
              onChange={(reps) => onChange({ reps })}
              step={1}
              max={200}
              suffix="reps"
              label="reps"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
