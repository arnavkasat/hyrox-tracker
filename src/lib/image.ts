/**
 * Client-side image preparation for the weekly photo.
 *
 * Re-encoding through a canvas is what strips EXIF — including GPS — because
 * the canvas only ever receives pixels. `imageOrientation: "from-image"` has
 * to be asked for explicitly, or an iPhone portrait shot comes out sideways
 * once its orientation tag is gone.
 */

const MAX_DIMENSION = 1600;
const TARGET_BYTES = 500 * 1024;
const MIN_QUALITY = 0.4;

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
};

export async function compressImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the image on this device.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Step the quality down until it fits, rather than guessing once.
  let quality = 0.85;
  let blob = await toBlob(canvas, quality);

  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }

  return { blob, width, height, bytes: blob.size };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image."))),
      "image/jpeg",
      quality,
    );
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
