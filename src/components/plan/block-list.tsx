"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/ios/stepper";
import { BLOCKS, BLOCK_CATEGORIES } from "@/lib/plan/blocks";
import type { PlannedExercise } from "@/lib/plan/template";
import { cn } from "@/lib/utils";

/**
 * Edits a list of prescribed exercises. Shared by the day editor in the
 * calendar and the weekly template builder, so the two can't drift.
 */
export function BlockList({
  planned,
  onChange,
  emptyLabel = "Nothing scheduled — this is a rest day.",
}: {
  planned: PlannedExercise[];
  onChange: (next: PlannedExercise[]) => void;
  emptyLabel?: string;
}) {
  const [picker, setPicker] = useState<string | null>(null);

  function add(name: string) {
    const block = BLOCKS.find((b) => b.exercise === name);
    if (!block) return;
    onChange([
      ...planned,
      { exercise: block.exercise, kind: block.kind, sets: block.sets, reps: block.reps },
    ]);
    setPicker(null);
  }

  function update(index: number, patch: Partial<PlannedExercise>) {
    onChange(planned.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= planned.length) return;
    const next = [...planned];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <>
      {planned.length === 0 ? (
        <p className="surface rounded-2xl px-4 py-5 text-center text-[15px] text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {planned.map((exercise, index) => (
            <li key={`${exercise.exercise}-${index}`} className="surface rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${exercise.exercise} up`}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="press flex size-6 items-center justify-center text-muted-foreground disabled:opacity-25"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${exercise.exercise} down`}
                    onClick={() => move(index, 1)}
                    disabled={index === planned.length - 1}
                    className="press flex size-6 items-center justify-center text-muted-foreground disabled:opacity-25"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>

                <span className="min-w-0 flex-1 truncate text-[17px]">{exercise.exercise}</span>

                <button
                  type="button"
                  aria-label={`Remove ${exercise.exercise}`}
                  onClick={() => onChange(planned.filter((_, i) => i !== index))}
                  className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                <Stepper
                  value={exercise.sets}
                  onChange={(sets) => update(index, { sets })}
                  min={1}
                  max={20}
                  suffix="sets"
                  label={`${exercise.exercise} sets`}
                />
                <Input
                  value={exercise.reps}
                  onChange={(e) => update(index, { reps: e.target.value })}
                  aria-label={`${exercise.exercise} target`}
                  placeholder="reps"
                  className="h-11 w-28 rounded-xl text-center text-[15px]"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setPicker(BLOCK_CATEGORIES[0])}
        className="press surface mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-primary"
      >
        <Plus className="size-4" />
        Add exercise
      </button>

      {picker ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 pt-safe">
            <span className="text-[17px] font-semibold">Add exercise</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPicker(null)}
              className="press surface flex size-9 items-center justify-center rounded-full"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-hairline px-4 py-2.5">
            {BLOCK_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setPicker(category)}
                className={cn(
                  "press shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap",
                  picker === category
                    ? "brand-fill text-primary-foreground"
                    : "surface text-muted-foreground",
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <ul className="flex-1 space-y-2 overflow-y-auto p-4 pb-safe">
            {BLOCKS.filter((b) => b.category === picker).map((block) => (
              <li key={block.exercise}>
                <button
                  type="button"
                  onClick={() => add(block.exercise)}
                  className="press surface flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left"
                >
                  <span className="min-w-0 truncate text-[17px]">{block.exercise}</span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    {block.sets} × {block.reps}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
