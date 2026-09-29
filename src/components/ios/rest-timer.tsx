"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating rest countdown, docked just above the tab bar. */
export function RestTimer({
  secondsLeft,
  onAdd,
  onDismiss,
}: {
  secondsLeft: number;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const done = secondsLeft <= 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="mx-auto max-w-lg px-4 pb-[60px]">
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur-xl",
            done
              ? "border-primary/40 bg-primary/15"
              : "border-border bg-card/90",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted-foreground">
              {done ? "Rest complete" : "Resting"}
            </p>
            <p
              className={cn(
                "text-[22px] leading-tight font-semibold",
                done && "text-primary",
              )}
            >
              {mins}:{String(secs).padStart(2, "0")}
            </p>
          </div>

          <button
            type="button"
            onClick={onAdd}
            aria-label="Add 30 seconds"
            className="flex h-11 items-center gap-1 rounded-lg bg-secondary px-3 text-[15px] font-medium active:scale-95"
          >
            <Plus className="size-4" />
            30s
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss rest timer"
            className="flex size-11 items-center justify-center rounded-lg bg-secondary active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
