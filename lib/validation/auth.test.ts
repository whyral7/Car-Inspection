import { describe, expect, it } from "vitest";
import { indianMobileSchema, otpSchema, safeNextPath } from "./auth";

describe("indianMobileSchema", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["6000000000", "+916000000000"],
  ])("normalises %s", (input, expected) => {
    expect(indianMobileSchema.parse(input)).toBe(expected);
  });

  it.each(["", "12345", "5876543210", "98765432101", "+1 415 555 0100", "abcdefghij"])("rejects %s", (input) => {
    expect(indianMobileSchema.safeParse(input).success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts 6 digits, ignoring spaces", () => {
    expect(otpSchema.parse("123 456")).toBe("123456");
  });
  it.each(["12345", "1234567", "abcdef"])("rejects %s", (input) => {
    expect(otpSchema.safeParse(input).success).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps relative app paths", () => {
    expect(safeNextPath("/app/cars?x=1")).toBe("/app/cars?x=1");
  });
  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "app"])("falls back for %s", (input) => {
    expect(safeNextPath(input)).toBe("/app");
  });
});
