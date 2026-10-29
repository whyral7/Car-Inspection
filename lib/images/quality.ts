// A quick look at a photo before it is uploaded and sent to the AI: too dark, washed out or blurry
// photos come back "unclear" anyway, so it's cheaper to offer a retake on the spot. Only a warning:
// the user can always keep the photo.

export type PhotoIssue = "dark" | "bright" | "blurry";

export type PhotoStats = {
  /** Mean luma, 0 (black) to 255 (white). */
  brightness: number;
  /** Variance of the Laplacian of the luma: low means few sharp edges, i.e. blur or shake. */
  sharpness: number;
};

/** Width the photo is scaled to before measuring. Small enough to be instant on a budget phone. */
export const SAMPLE_WIDTH = 256;

// Deliberately cautious: a false alarm on a good photo costs a tap and some trust.
export const THRESHOLDS = { dark: 40, bright: 240, blurry: 12 } as const;

/** Brightness and sharpness of RGBA pixels (as from canvas getImageData). */
export function photoStats(rgba: Uint8ClampedArray, width: number, height: number): PhotoStats {
  const n = width * height;
  const luma = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    luma[i] = y;
    sum += y;
  }

  let count = 0;
  let mean = 0;
  let m2 = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = luma[i - width] + luma[i + width] + luma[i - 1] + luma[i + 1] - 4 * luma[i];
      // Welford's running variance.
      count++;
      const delta = lap - mean;
      mean += delta / count;
      m2 += delta * (lap - mean);
    }
  }

  return { brightness: n ? sum / n : 0, sharpness: count > 1 ? m2 / (count - 1) : 0 };
}

export function photoIssue({ brightness, sharpness }: PhotoStats): PhotoIssue | null {
  if (brightness < THRESHOLDS.dark) return "dark";
  if (brightness > THRESHOLDS.bright) return "bright";
  if (sharpness < THRESHOLDS.blurry) return "blurry";
  return null;
}

/** Browser-only. Measures a photo blob; resolves null if it can't be read (the upload goes ahead). */
export async function checkPhoto(blob: Blob): Promise<PhotoIssue | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const width = SAMPLE_WIDTH;
    const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return photoIssue(photoStats(ctx.getImageData(0, 0, width, height).data, width, height));
  } catch {
    return null;
  }
}
