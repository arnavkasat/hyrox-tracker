"use client";

import { useTransition } from "react";
import { Check, TrendingDown, TrendingUp, Timer, Battery, X } from "lucide-react";
import { toast } from "sonner";

import { decide, type Decision, type StoredChange } from "./actions";
import { Button } from "@/components/ui/button";
import { formatDayMonth } from "@/lib/date";
import { cn } from "@/lib/utils";

const ICONS = {
  overload: TrendingUp,
  deload: TrendingDown,
  readiness: Battery,
  pace: Timer,
} as const;

export function ChangeCard({
  weekStart,
  change,
  decision,
}: {
  weekStart: string;
  change: StoredChange;
  decision: Decision | undefined;
}) {
  const [pending, startTransition] = useTransition();
  const Icon = ICONS[change.kind as keyof typeof ICONS] ?? TrendingUp;

  function choose(choice: "accepted" | "rejected") {
    startTransition(async () => {
      const result = await decide(weekStart, change.id, choice);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(choice === "accepted" ? "Applied to your plan" : "Dismissed");
    });
  }

  return (
    <div
      className={cn(
        "surface rounded-2xl p-4",
        decision?.decision === "rejected" && "opacity-55",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/14 text-primary">
          <Icon className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] leading-snug font-semibold">{change.title}</h3>

          {/* The rule's reason is the fact; the model's note is the read on it. */}
          <p className="mt-1.5 text-[14px] leading-snug text-muted-foreground">
            {change.reason}
          </p>
          {change.note ? (
            <p className="mt-1.5 text-[14px] leading-snug">{change.note}</p>
          ) : null}

          {change.patches.length > 0 ? (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Affects{" "}
              {change.patches.map((p) => formatDayMonth(p.date)).join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      {decision ? (
        <p
          className={cn(
            "mt-3 text-center text-[13px] font-medium",
            decision.decision === "accepted" ? "text-primary" : "text-muted-foreground",
          )}
        >
          {decision.decision === "accepted" ? "Applied" : "Dismissed"}
        </p>
      ) : (
        <div className="mt-3.5 flex gap-2">
          <Button
            variant="brand"
            size="ios"
            className="flex-1"
            onClick={() => choose("accepted")}
            disabled={pending}
          >
            <Check className="size-4" />
            Accept
          </Button>
          <Button
            variant="glass"
            size="ios"
            className="flex-1"
            onClick={() => choose("rejected")}
            disabled={pending}
          >
            <X className="size-4" />
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
