"use client";

import { useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { savePhoto } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { compressImage, formatBytes } from "@/lib/image";
import { cn } from "@/lib/utils";

/**
 * The Sunday step of the check-in.
 *
 * The file goes straight from the browser to the private bucket — the
 * storage policies scope writes to "<user_id>/…" — and only the path is
 * handed to the server afterwards.
 */
export function PhotoStep({
  date,
  week,
  userId,
  existingPath,
  onUploaded,
}: {
  date: string;
  week: number | null;
  userId: string;
  existingPath: string | null;
  onUploaded: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [path, setPath] = useState(existingPath);
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const prepared = await compressImage(file);
      const storagePath = `${userId}/${date}.jpg`;

      const supabase = createClient();
      const { error } = await supabase.storage
        .from("photos")
        .upload(storagePath, prepared.blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw new Error(error.message);

      await savePhoto({ date, week, storage_path: storagePath });

      setPath(storagePath);
      setSize(formatBytes(prepared.bytes));
      setPreview(URL.createObjectURL(prepared.blob));
      onUploaded(storagePath);
      toast.success("Photo saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[17px]">Weekly photo</span>
        <span className="text-[13px] text-muted-foreground">Sundays</span>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={cn(
          "press surface flex h-20 w-full items-center gap-4 rounded-2xl px-4 text-left",
          path && "border-primary/40",
        )}
      >
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
          {busy ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : path ? (
            <Check className="size-5 text-primary" />
          ) : (
            <Camera className="size-5 text-muted-foreground" />
          )}
        </span>

        <span className="min-w-0">
          <span className="block text-[17px]">
            {busy ? "Preparing…" : path ? "Photo saved" : "Add this week's photo"}
          </span>
          <span className="block text-[13px] text-muted-foreground">
            {size
              ? `Compressed to ${size}, location data removed`
              : path
                ? "Tap to replace"
                : "Resized and stripped of location data before upload"}
          </span>
        </span>
      </button>
    </div>
  );
}
