import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./dealer";

const dealerId = "11111111-1111-1111-1111-111111111111";
const schema = onboardingSchema(dealerId);
const valid = {
  owner_name: "  Ramesh Kumar ",
  business_name: "Kumar Motors",
  city: "Pune",
  address: "Shop 4, Baner Road",
  logo_path: "",
};

describe("onboardingSchema", () => {
  it("trims fields and treats an empty logo as none", () => {
    const out = schema.parse(valid);
    expect(out.owner_name).toBe("Ramesh Kumar");
    expect(out.logo_path).toBeNull();
  });

  it("accepts a logo in the dealer's own folder", () => {
    const logo_path = `${dealerId}/logo-1729320000000.png`;
    expect(schema.parse({ ...valid, logo_path }).logo_path).toBe(logo_path);
  });

  it.each([
    "22222222-2222-2222-2222-222222222222/logo-1.png",
    `${dealerId}/../other/logo-1.png`,
    `${dealerId}/logo-1.exe`,
    "logo-1.png",
  ])("rejects logo path %s", (logo_path) => {
    expect(schema.safeParse({ ...valid, logo_path }).success).toBe(false);
  });

  it("requires all text fields", () => {
    const result = schema.safeParse({ ...valid, business_name: " ", city: "" });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["business_name", "city"]));
  });
});
