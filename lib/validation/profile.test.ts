import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./profile";

const profileId = "11111111-1111-1111-1111-111111111111";
const schema = onboardingSchema(profileId);
const valid = {
  user_type: "dealer",
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

  it("accepts a logo in the user's own folder", () => {
    const logo_path = `${profileId}/logo-1729320000000.png`;
    expect(schema.parse({ ...valid, logo_path }).logo_path).toBe(logo_path);
  });

  it.each([
    "22222222-2222-2222-2222-222222222222/logo-1.png",
    `${profileId}/../other/logo-1.png`,
    `${profileId}/logo-1.exe`,
    "logo-1.png",
  ])("rejects logo path %s", (logo_path) => {
    expect(schema.safeParse({ ...valid, logo_path }).success).toBe(false);
  });

  it("requires a user type, name and city", () => {
    const result = schema.safeParse({ ...valid, user_type: "", owner_name: " ", city: "" });
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["user_type", "owner_name", "city"]));
  });

  it.each(["mechanic", undefined])("rejects user type %s", (user_type) => {
    expect(schema.safeParse({ ...valid, user_type }).success).toBe(false);
  });

  it("lets a dealer leave business name, address and logo empty", () => {
    const out = schema.parse({ ...valid, business_name: " ", address: "" });
    expect(out).toMatchObject({ user_type: "dealer", business_name: null, address: null, logo_path: null });
  });

  it("still checks business name and address when a dealer fills them in", () => {
    const result = schema.safeParse({ ...valid, business_name: "K", address: "Pune" });
    const fields = result.error?.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["business_name", "address"]));
  });

  it.each(["car_owner", "buyer"] as const)("clears dealer-only fields for %s", (user_type) => {
    const out = schema.parse({ ...valid, user_type, logo_path: `${profileId}/logo-1.png` });
    expect(out).toEqual({ user_type, owner_name: "Ramesh Kumar", city: "Pune", business_name: null, address: null, logo_path: null });
  });

  it("doesn't need dealer-only fields for other types", () => {
    const out = schema.parse({ user_type: "buyer", owner_name: "Asha", city: "Pune" });
    expect(out).toMatchObject({ user_type: "buyer", business_name: null, address: null, logo_path: null });
  });
});
