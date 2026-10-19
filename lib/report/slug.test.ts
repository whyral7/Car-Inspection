import { describe, expect, it } from "vitest";
import { generateSlug, isValidSlug } from "./slug";

describe("generateSlug", () => {
  it("is 10 characters from the unambiguous alphabet and passes the database check", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[2-9a-km-np-z]{10}$/);
      expect(isValidSlug(slug)).toBe(true);
    }
  });

  it("doesn't repeat", () => {
    const slugs = new Set(Array.from({ length: 1000 }, () => generateSlug()));
    expect(slugs.size).toBe(1000);
  });
});

describe("isValidSlug", () => {
  it("rejects anything the database would", () => {
    expect(isValidSlug("short")).toBe(false);
    expect(isValidSlug("ABCDEFGHJK")).toBe(false);
    expect(isValidSlug("abc-defghjk")).toBe(false);
    expect(isValidSlug("a".repeat(33))).toBe(false);
    expect(isValidSlug("../../etc")).toBe(false);
  });
});
