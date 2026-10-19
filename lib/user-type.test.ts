import { describe, expect, it } from "vitest";
import { displayName, isProfileComplete } from "./user-type";

describe("displayName", () => {
  it("uses a dealer's business name, or their own name without one", () => {
    expect(displayName({ user_type: "dealer", owner_name: "Ravi", business_name: "Sharma Motors" })).toBe("Sharma Motors");
    expect(displayName({ user_type: "dealer", owner_name: "Ravi", business_name: null })).toBe("Ravi");
  });

  it.each(["car_owner", "buyer"] as const)("uses the person's name for a %s", (user_type) => {
    expect(displayName({ user_type, owner_name: "Asha", business_name: "Old Motors" })).toBe("Asha");
  });

  it("is empty before signup is finished", () => {
    expect(displayName({ user_type: null, owner_name: null, business_name: null })).toBe("");
  });
});

describe("isProfileComplete", () => {
  it("needs a user type and a name", () => {
    expect(isProfileComplete({ user_type: "buyer", owner_name: "Asha" })).toBe(true);
    expect(isProfileComplete({ user_type: null, owner_name: "Asha" })).toBe(false);
    expect(isProfileComplete({ user_type: "dealer", owner_name: null })).toBe(false);
  });
});
