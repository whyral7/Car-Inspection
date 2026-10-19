import { PHOTO } from "@/lib/config";

type CompressOptions = {
  maxEdgePx?: number;
  type?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number;
};

/**
 * Browser-only. Scales an image down so its long edge is at most `maxEdgePx`
 * (never upscales) and re-encodes it. Defaults match the inspection photo rule:
 * 1600px long edge, JPEG quality 0.8. EXIF orientation is applied.
 */
export async function compressImage(file: Blob, options: CompressOptions = {}): Promise<Blob> {
  const { maxEdgePx = PHOTO.maxEdgePx, type = "image/jpeg", quality = PHOTO.jpegQuality } = options;

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdgePx / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  if (type === "image/jpeg") {
    // JPEG has no transparency; paint white so transparent logos don't turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed"))), type, quality);
  });
}
