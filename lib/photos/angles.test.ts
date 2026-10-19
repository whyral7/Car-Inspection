import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/strings";
import { ANGLES, ANGLE_KEYS, REQUIRED_ANGLE_COUNT, firstMissingIndex, isAngleKey, photoPath, photoProgress } from "./angles";

describe("photo angles", () => {
  it("has the 20 angles in the CLAUDE.md order", () => {
    expect(ANGLE_KEYS).toEqual([
      "front", "front_left", "left", "rear_left", "rear", "rear_right", "right", "front_right",
      "engine", "chassis", "odometer", "dashboard", "front_seats", "rear_seats", "boot", "spare",
      "tyre_fl", "tyre_fr", "tyre_rl", "tyre_rr",
    ]);
    expect(ANGLES.map((a) => a.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("requires angles 1-12 only", () => {
    expect(ANGLES.filter((a) => a.required).map((a) => a.number)).toEqual(Array.from({ length: REQUIRED_ANGLE_COUNT }, (_, i) => i + 1));
    expect(ANGLES.find((a) => a.key === "dashboard")?.required).toBe(true);
    expect(ANGLES.find((a) => a.key === "front_seats")?.required).toBe(false);
  });

  it("matches the angle_key check constraint in the database migration", () => {
    const sql = readFileSync("supabase/migrations/20261019000000_init.sql", "utf8");
    const block = /angle_key text not null check \(angle_key in \(([^)]*)\)\)/.exec(sql)?.[1] ?? "";
    const dbKeys = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...dbKeys].sort()).toEqual([...ANGLE_KEYS].sort());
  });

  it("has a label and a tip for every angle", () => {
    for (const key of ANGLE_KEYS) {
      expect(t.photos.angles[key].label.length).toBeGreaterThan(0);
      expect(t.photos.angles[key].tip.length).toBeGreaterThan(0);
    }
  });

  it("gives every tyre photo a corner to highlight", () => {
    expect(ANGLES.filter((a) => a.hint === "tyre").map((a) => a.corner)).toEqual(["fl", "fr", "rl", "rr"]);
  });

  it("stores photos at cars/{car_id}/{angle_key}.jpg", () => {
    expect(photoPath("abc", "front_left")).toBe("cars/abc/front_left.jpg");
  });

  it("recognises angle keys", () => {
    expect(isAngleKey("boot")).toBe(true);
    expect(isAngleKey("roof")).toBe(false);
  });
});

describe("photoProgress", () => {
  it("counts all photos and required photos separately", () => {
    const p = photoProgress(["front", "left", "boot", "spare"]);
    expect(p).toMatchObject({ done: 4, total: 20, requiredDone: 2, requiredTotal: 12, allRequiredDone: false });
  });

  it("is complete when angles 1-12 are present, even without the optional ones", () => {
    const p = photoProgress(ANGLE_KEYS.slice(0, 12));
    expect(p.allRequiredDone).toBe(true);
    expect(p.done).toBe(12);
  });

  it("ignores unknown keys and duplicates", () => {
    expect(photoProgress(["front", "front", "roof"]).done).toBe(1);
  });
});

describe("firstMissingIndex", () => {
  it("finds the first gap, not just the next after the last", () => {
    expect(firstMissingIndex(["front", "left"])).toBe(1);
    expect(firstMissingIndex([])).toBe(0);
  });

  it("is -1 when everything is covered", () => {
    expect(firstMissingIndex(ANGLE_KEYS)).toBe(-1);
  });
});
