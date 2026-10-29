import { describe, expect, it } from "vitest";
import { inspectionState, type InspectionInput } from "@/lib/inspection";
import { ANGLE_KEYS } from "@/lib/photos/angles";
import { CHECKLIST_KEYS } from "@/lib/checklist";

const photos = (n: number, ai_status: InspectionInput["photos"][number]["ai_status"] = "done") => ANGLE_KEYS.slice(0, n).map((angle_key) => ({ angle_key, ai_status }));
const checklist = (n: number) => CHECKLIST_KEYS.slice(0, n).map((item_key) => ({ item_key, result: "ok" as const }));
const base: InspectionInput = { status: "draft", photos: [], findings: [], checklist: [] };

describe("inspectionState", () => {
  it("starts on photos with no score", () => {
    const s = inspectionState(base);
    expect(s.next).toBe("photos");
    expect(s.score).toBeNull();
    expect(s.stepsDone).toBe(0);
  });

  it("moves to damage notes once the 12 required photos are in", () => {
    expect(inspectionState({ ...base, photos: photos(11) }).next).toBe("photos");
    expect(inspectionState({ ...base, photos: photos(12, "pending") }).next).toBe("findings");
  });

  it("waits for AI checks and unreviewed notes before the checklist", () => {
    const withNote = { ...base, photos: photos(12), findings: [{ severity: "minor" as const, accepted: false }] };
    expect(inspectionState(withNote).next).toBe("findings");
    expect(inspectionState(withNote).toReview).toBe(1);
    expect(inspectionState({ ...withNote, findings: [{ severity: "minor", accepted: true }] }).next).toBe("checklist");
  });

  it("counts unclear photos as checked", () => {
    expect(inspectionState({ ...base, photos: [...photos(11), { angle_key: "dashboard", ai_status: "unclear" }] }).analysed).toBe(true);
  });

  it("hides the score until the checklist is started, then marks it provisional", () => {
    expect(inspectionState({ ...base, photos: photos(20) }).score).toBeNull();
    const started = inspectionState({ ...base, photos: photos(20), checklist: checklist(3) });
    expect(started.score).toEqual({ value: 10, band: "good", provisional: true });
  });

  it("goes to the report once the inspection is finished", () => {
    const done = inspectionState({ ...base, status: "inspected", photos: photos(20), checklist: checklist(19) });
    expect(done.next).toBe("report");
    expect(done.score?.provisional).toBe(false);
    expect(done.stepsDone).toBe(3);
    expect(inspectionState({ ...base, status: "published", photos: photos(20), checklist: checklist(19) }).stepsDone).toBe(4);
  });
});
