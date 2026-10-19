import { describe, expect, it } from "vitest";
import { sampleReportView } from "./sample";

describe("sample report", () => {
  it("matches the numbers promised on the landing page", () => {
    const view = sampleReportView();
    expect(view.scoreText).toBe("8.4");
    expect(view.findings).toHaveLength(2);
    expect(view.photos).toBeNull();
    expect(view.car.regNumber).toBe("MH12AB1234");
  });
});
