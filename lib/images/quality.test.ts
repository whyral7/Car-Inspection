import { describe, expect, it } from "vitest";
import { photoIssue, photoStats, THRESHOLDS } from "./quality";

function image(width: number, height: number, pixel: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = pixel(x, y);
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return data;
}

describe("photoStats", () => {
  it("measures brightness", () => {
    expect(photoStats(image(10, 10, () => 200), 10, 10).brightness).toBeCloseTo(200);
  });

  it("finds no edges in a flat image and many in a checkerboard", () => {
    expect(photoStats(image(20, 20, () => 128), 20, 20).sharpness).toBe(0);
    expect(photoStats(image(20, 20, (x, y) => ((x + y) % 2 ? 220 : 40)), 20, 20).sharpness).toBeGreaterThan(1000);
  });
});

describe("photoIssue", () => {
  it("flags dark, washed-out and blurry photos", () => {
    expect(photoIssue({ brightness: THRESHOLDS.dark - 1, sharpness: 500 })).toBe("dark");
    expect(photoIssue({ brightness: THRESHOLDS.bright + 1, sharpness: 500 })).toBe("bright");
    expect(photoIssue({ brightness: 120, sharpness: THRESHOLDS.blurry - 1 })).toBe("blurry");
  });

  it("passes a normal photo", () => {
    expect(photoIssue({ brightness: 120, sharpness: 300 })).toBeNull();
  });
});
