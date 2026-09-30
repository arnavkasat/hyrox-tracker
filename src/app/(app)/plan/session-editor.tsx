"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { applyPatches, resetDayToTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Stepper } from "@/components/ios/stepper";
import { BLOCKS, BLOCK_CATEGORIES, PRESETS } from "@/lib/plan/blocks";
import type { PlannedExercise } from "@/lib/plan/template";
import type { PlanSession } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Block-based session builder. Everything it produces goes out as a
 * `SessionPatch` through `applyPatches`, the same door the weekly review
 * will use.
 */
export function SessionEditor({
  session,
  onDone,
}: {
  session: PlanSession;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(session.title);
  const [planned, setPlanned] = useState<PlannedExercise[]>(session.planned);
  const [withPartner, setWithPartner] = useState(session.with_partner);
  const [type, setType] = useState(session.type);
  const [picker, setPicker] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = session.status === "completed";

  function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTitle(preset.title);
    setType(preset.type);
    setPlanned(preset.planned);
    setWithPartner(preset.withPartner ?? false);
  }

  function addBlock(name: string) {
    const block = BLOCKS.find((b) => b.exercise === name);
    if (!block) return;
    setPlanned((current) => [
      ...current,
      { exercise: block.exercise, kind: block.kind, sets: block.sets, reps: block.reps },
    ]);
    setPicker(null);
  }

  function updateBlock(index: number, patch: Partial<PlannedExercise>) {
    setPlanned((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removeBlock(index: number) {
    setPlanned((current) => current.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    setPlanned((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await applyPatches([
        { date: session.date, title: title.trim(), type, planned, with_partner: withPartner },
      ]);

      if (!result.ok) {
        toast.error(result.issues[0]?.message ?? "Could not save");
        return;
      }
      for (const warning of result.warnings) toast.warning(warning.message);
      toast.success("Session updated");
      onDone();
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetDayToTemplate(session.date);
      if (!result.ok) {
        toast.error(result.issues[0]?.message ?? "Could not reset");
        return;
      }
      toast.success("Back to the original plan");
      onDone();
    });
  }

  if (locked) {
    return (
      <div className="px-4 pb-6">
        <p className="text-[15px] text-muted-foreground">
          This session is already logged, so it can&rsquo;t be rewritten.
        </p>
        <Button variant="glass" size="ios" className="mt-4 w-full" onClick={onDone}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-6">
      {/* ------------------------------------------------------- title -- */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session name"
        aria-label="Session name"
        className="h-12 rounded-xl text-[17px] font-medium"
      />

      {/* ----------------------------------------------------- presets -- */}
      <div>
        <p className="pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          Start from
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="press surface rounded-full px-3.5 py-2 text-[13px] font-medium"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ blocks -- */}
      <div>
        <p className="pb-2 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">
          Exercises
        </p>

        {planned.length === 0 ? (
          <p className="surface rounded-2xl px-4 py-5 text-center text-[15px] text-muted-foreground">
            Nothing scheduled — this is a rest day.
          </p>
        ) : (
          <ul className="space-y-2">
            {planned.map((exercise, index) => (
              <li key={`${exercise.exercise}-${index}`} className="surface rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${exercise.exercise} up`}
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="press flex size-6 items-center justify-center text-muted-foreground disabled:opacity-25"
                    >
                      <GripVertical className="size-4 rotate-90" />
                    </button>
                  </div>

                  <span className="min-w-0 flex-1 truncate text-[17px]">{exercise.exercise}</span>

                  <button
                    type="button"
                    aria-label={`Remove ${exercise.exercise}`}
                    onClick={() => removeBlock(index)}
                    className="press flex size-9 items-center justify-center rounded-lg text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                  <Stepper
                    value={exercise.sets}
                    onChange={(sets) => updateBlock(index, { sets })}
                    min={1}
                    max={20}
                    suffix="sets"
                    label={`${exercise.exercise} sets`}
                  />
                  <Input
                    value={exercise.reps}
                    onChange={(e) => updateBlock(index, { reps: e.target.value })}
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
      </div>

      {/* ----------------------------------------------------- partner -- */}
      <div className="surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <span className="text-[17px]">With partner</span>
        <Switch
          checked={withPartner}
          onCheckedChange={setWithPartner}
          aria-label="With partner"
        />
      </div>

      {/* ------------------------------------------------------ actions -- */}
      <div className="space-y-2">
        <Button variant="ember" size="ios" className="w-full" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save session"}
        </Button>

        {session.origin !== "generated" ? (
          <Button
            variant="glass"
            size="ios"
            className="w-full"
            onClick={reset}
            disabled={pending}
          >
            <RotateCcw className="size-4" />
            Reset to original plan
          </Button>
        ) : null}
      </div>

      {/* ------------------------------------------------ block picker -- */}
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
                    ? "ember text-primary-foreground"
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
                  onClick={() => addBlock(block.exercise)}
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
    </div>
  );
}
