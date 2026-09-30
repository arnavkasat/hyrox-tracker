"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { applyPatches, resetDayToTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BlockList } from "@/components/plan/block-list";
import { PRESETS } from "@/lib/plan/blocks";
import type { PlannedExercise } from "@/lib/plan/template";
import type { PlanSession } from "@/lib/supabase/types";

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
        <BlockList planned={planned} onChange={setPlanned} />
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
        <Button variant="brand" size="ios" className="w-full" onClick={save} disabled={pending}>
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

    </div>
  );
}
