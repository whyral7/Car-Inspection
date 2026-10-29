import { describe, expect, it } from "vitest";
import { ANGLE_KEYS } from "@/lib/photos/angles";
import { buildRequest, parseAnalysis, responseJsonSchema, userPrompt } from "./analysis";

const finding = (over: Record<string, unknown> = {}) => ({
  type: "dent",
  location: "front bumper, left corner",
  severity: "moderate",
  confidence: 0.9,
  note: "Palm-sized dent, paint intact.",
  ...over,
});

const reply = (body: Record<string, unknown>) => JSON.stringify({ unclear: false, findings: [], ...body });

describe("parseAnalysis", () => {
  it("accepts a valid reply", () => {
    const result = parseAnalysis(reply({ findings: [finding()] }), "front");
    expect(result).toEqual({
      ok: true,
      analysis: { unclear: false, findings: [finding()], allFindings: [finding()], odometerKm: null },
    });
  });

  it("drops findings below 0.5 confidence but keeps them in allFindings", () => {
    const result = parseAnalysis(reply({ findings: [finding({ confidence: 0.49 }), finding({ confidence: 0.5 }), finding({ confidence: 0.2 })] }), "left");
    expect(result.ok && result.analysis.findings.map((f) => f.confidence)).toEqual([0.5]);
    expect(result.ok && result.analysis.allFindings).toHaveLength(3);
  });

  it("passes through the unclear flag", () => {
    const result = parseAnalysis(reply({ unclear: true }), "rear");
    expect(result.ok && result.analysis.unclear).toBe(true);
  });

  it("tolerates a code fence or words around the JSON", () => {
    expect(parseAnalysis("```json\n" + reply({}) + "\n```", "front").ok).toBe(true);
    expect(parseAnalysis("Here you go: " + reply({}), "front").ok).toBe(true);
  });

  it("rejects non-JSON and wrong shapes", () => {
    expect(parseAnalysis("The car looks fine.", "front").ok).toBe(false);
    expect(parseAnalysis('{"unclear": false, "findings": [', "front").ok).toBe(false);
    expect(parseAnalysis(JSON.stringify({ findings: [] }), "front").ok).toBe(false);
    expect(parseAnalysis(reply({ findings: [finding({ type: "smudge" })] }), "front").ok).toBe(false);
    expect(parseAnalysis(reply({ findings: [finding({ severity: "severe" })] }), "front").ok).toBe(false);
    expect(parseAnalysis(reply({ findings: [finding({ confidence: 1.4 })] }), "front").ok).toBe(false);
  });

  it("trims long text instead of failing, and turns blanks into null", () => {
    const result = parseAnalysis(reply({ findings: [finding({ note: "x".repeat(500), location: "  " })] }), "front");
    expect(result.ok && result.analysis.findings[0].note).toHaveLength(300);
    expect(result.ok && result.analysis.findings[0].location).toBeNull();
  });

  it("reads the odometer only on the odometer photo", () => {
    const odo = parseAnalysis(reply({ odometer_km: 45230 }), "odometer");
    expect(odo.ok && odo.analysis.odometerKm).toBe(45230);
    const other = parseAnalysis(reply({ odometer_km: 45230 }), "dashboard");
    expect(other.ok && other.analysis.odometerKm).toBeNull();
  });

  it("treats an unreadable or implausible odometer as null", () => {
    for (const km of [null, -5, 9_999_999]) {
      const result = parseAnalysis(reply({ odometer_km: km }), "odometer");
      expect(result.ok && result.analysis.odometerKm).toBeNull();
    }
    const missing = parseAnalysis(reply({}), "odometer");
    expect(missing.ok && missing.analysis.odometerKm).toBeNull();
    const fractional = parseAnalysis(reply({ odometer_km: 45230.6 }), "odometer");
    expect(fractional.ok && fractional.analysis.odometerKm).toBe(45231);
  });

  it("caps the number of findings kept from one photo", () => {
    const result = parseAnalysis(reply({ findings: Array.from({ length: 40 }, () => finding()) }), "left");
    expect(result.ok && result.analysis.findings).toHaveLength(20);
  });
});

describe("prompts", () => {
  it("has a brief for every angle and asks for the odometer only on that photo", () => {
    for (const key of ANGLE_KEYS) {
      const text = userPrompt(key);
      expect(text).toContain("This photo should show");
      expect(text.includes("odometer_km")).toBe(key === "odometer");
      const schema = responseJsonSchema(key) as { required: string[] };
      expect(schema.required.includes("odometer_km")).toBe(key === "odometer");
    }
  });
});

describe("buildRequest", () => {
  it("sends the image before the text, with the JSON schema and the model from the caller", () => {
    const req = buildRequest("claude-test", "odometer", "QUJD");
    expect(req.model).toBe("claude-test");
    const content = req.messages[0].content as { type: string }[];
    expect(content.map((b) => b.type)).toEqual(["image", "text"]);
    expect(req.output_config?.format?.type).toBe("json_schema");
    expect((req.output_config?.format?.schema as { required: string[] }).required).toContain("odometer_km");
  });
});
