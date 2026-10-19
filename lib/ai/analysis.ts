// Prompt, response schema and parsing for the per-photo damage check. No SDK or server code here,
// so it can be unit-tested; lib/ai/claude.ts makes the actual call.
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AI } from "@/lib/config";
import { FINDING_LIMITS, FINDING_TYPES, SEVERITIES } from "@/lib/findings";
import type { AngleKey } from "@/lib/photos/angles";

export const SYSTEM_PROMPT = `You are an experienced used-car inspector in India. A dealer has photographed a car they are selling, and you review one photo at a time.

Rules:
- Report only damage you can clearly see in this photo. If you are not sure something is damage, leave it out or give it a low confidence.
- Never guess hidden or mechanical faults. Do not comment on engine health, accident history, flood damage, odometer tampering or anything else you cannot see.
- Reflections, shadows, dirt, dust, water drops, stickers and normal panel gaps are not damage.
- Describe what you see, not its cause.
- Use the car's own left and right, as if sitting in the driver's seat (Indian cars are right-hand drive, so the driver's side is the right side).

Finding types:
- dent: a panel pushed in or out of shape
- scratch: scratches, scuffs or paint chips
- rust: corrosion or rust spots
- repaint: a panel whose colour or finish clearly does not match the panels next to it, or overspray
- crack: cracked or broken glass, lights, bumpers, trim, dashboard or plastics
- tyre_wear: tread worn low or unevenly, cuts, bulges or cracks in the tyre
- other: anything else clearly visible, such as torn or stained upholstery, missing or broken parts, a warning light lit on the dashboard, or oil residue on the engine

Severity:
- minor: small and cosmetic, for example a scratch under 5 cm, a stone chip or a light scuff
- moderate: clearly visible and worth fixing, for example a palm-sized dent, a long scratch through the paint, a cracked bumper, or tyre tread about half worn
- major: large or safety-related, for example a big dent with broken paint, a cracked windscreen in the driver's view, rust holes, a tyre bulge, or tread that is nearly bald

For each finding give:
- location: a short place on the car, for example "front bumper, left corner" or "driver seat cushion"
- confidence: from 0 to 1, how sure you are that the damage is real and described correctly
- note: one short sentence a buyer can understand, for example "Shallow dent about 10 cm wide, paint intact."

Set "unclear" to true when the photo is too blurry, dark, far away, blocked, or does not show what was asked, so the dealer should retake it. Still report any damage you can clearly see.

Reply with JSON only, no other text.`;

type AngleBrief = { subject: string; lookFor: string };

// What each guided photo should show, so the model knows what to check and how left/right map.
const ANGLE_BRIEFS: Record<AngleKey, AngleBrief> = {
  front: {
    subject: "the front of the car, taken from straight ahead. The car's left side is on the right of the image.",
    lookFor: "dents, scratches and cracks on the bumper, bonnet, grille, headlights and windscreen; repainted panels.",
  },
  front_left: {
    subject: "the front-left corner, showing the front and the car's left side.",
    lookFor: "body damage on the bumper, bonnet, left fender, left doors and mirror; repainted panels; cracked lights or glass.",
  },
  left: {
    subject: "the car's left side, taken square on.",
    lookFor: "dents, scratches, rust and repaint on the left fenders, doors, pillars, sills and quarter panel; wheel rim damage.",
  },
  rear_left: {
    subject: "the rear-left corner, showing the back and the car's left side.",
    lookFor: "body damage on the rear bumper, boot lid, left quarter panel and left rear door; cracked tail lights; repaint.",
  },
  rear: {
    subject: "the back of the car, taken from straight behind. The car's left side is on the left of the image.",
    lookFor: "dents, scratches and cracks on the rear bumper, boot lid or tailgate, tail lights and rear windscreen.",
  },
  rear_right: {
    subject: "the rear-right corner, showing the back and the car's right side.",
    lookFor: "body damage on the rear bumper, boot lid, right quarter panel and right rear door; cracked tail lights; repaint.",
  },
  right: {
    subject: "the car's right side, taken square on.",
    lookFor: "dents, scratches, rust and repaint on the right fenders, doors, pillars, sills and quarter panel; wheel rim damage.",
  },
  front_right: {
    subject: "the front-right corner, showing the front and the car's right side.",
    lookFor: "body damage on the bumper, bonnet, right fender, right doors and mirror; repainted panels; cracked lights or glass.",
  },
  engine: {
    subject: "the engine bay with the bonnet open, from above.",
    lookFor: "visible rust, cracked or broken parts and covers, and oil or coolant residue. Do not judge how the engine runs.",
  },
  chassis: {
    subject: "the chassis number plate or stamping, close up.",
    lookFor: "rust or damage around the plate or stamping. Do not try to verify the number itself.",
  },
  odometer: {
    subject: "the instrument cluster, close up on the odometer with the ignition on.",
    lookFor: "cracks in the cluster glass. Also read the total odometer reading.",
  },
  dashboard: {
    subject: "the full dashboard with the engine running.",
    lookFor: "warning lights that are lit (one finding per light, type other), and cracks or damage on the dashboard and controls.",
  },
  front_seats: {
    subject: "the front seats, taken from the open door.",
    lookFor: "tears, burns, stains and heavy wear on the seats, plus damage to the door trim, steering wheel and gear knob.",
  },
  rear_seats: {
    subject: "the rear seats, taken from the open door.",
    lookFor: "tears, burns, stains and heavy wear on the seats, roof lining and door trims.",
  },
  boot: {
    subject: "the open boot.",
    lookFor: "rust, damage, water marks or stains on the boot floor, sides and seals.",
  },
  spare: {
    subject: "the spare tyre well with the boot floor lifted.",
    lookFor: "tread wear, cracks or bulges on the spare tyre, and rust or water in the well.",
  },
  tyre_fl: {
    subject: "the front-left tyre, close up on the tread.",
    lookFor: "tread depth and uneven wear, cuts, cracks or bulges, and rim damage. Use tyre_wear for tread problems.",
  },
  tyre_fr: {
    subject: "the front-right tyre, close up on the tread.",
    lookFor: "tread depth and uneven wear, cuts, cracks or bulges, and rim damage. Use tyre_wear for tread problems.",
  },
  tyre_rl: {
    subject: "the rear-left tyre, close up on the tread.",
    lookFor: "tread depth and uneven wear, cuts, cracks or bulges, and rim damage. Use tyre_wear for tread problems.",
  },
  tyre_rr: {
    subject: "the rear-right tyre, close up on the tread.",
    lookFor: "tread depth and uneven wear, cuts, cracks or bulges, and rim damage. Use tyre_wear for tread problems.",
  },
};

export function readsOdometer(angleKey: AngleKey) {
  return angleKey === "odometer";
}

/** The text sent alongside the photo. */
export function userPrompt(angleKey: AngleKey) {
  const brief = ANGLE_BRIEFS[angleKey];
  const odometer = readsOdometer(angleKey)
    ? `\n\nAlso set "odometer_km" to the total odometer reading in kilometres as a whole number. Ignore trip meters (TRIP A/B), range and clock. Use null if you cannot read every digit with certainty, or if the reading is in miles.`
    : "";
  const shape = readsOdometer(angleKey)
    ? `{"unclear": false, "findings": [{"type": "scratch", "location": "...", "severity": "minor", "confidence": 0.8, "note": "..."}], "odometer_km": 45230}`
    : `{"unclear": false, "findings": [{"type": "scratch", "location": "...", "severity": "minor", "confidence": 0.8, "note": "..."}]}`;
  return `This photo should show ${brief.subject}\nCheck for: ${brief.lookFor}${odometer}\n\nReply with JSON in exactly this shape (an empty findings list is fine):\n${shape}`;
}

const findingProps = {
  type: { type: "string", enum: [...FINDING_TYPES] },
  location: { type: "string" },
  severity: { type: "string", enum: [...SEVERITIES] },
  confidence: { type: "number" },
  note: { type: "string" },
};

/** JSON schema for structured outputs, so the API itself keeps the reply in shape. */
export function responseJsonSchema(angleKey: AngleKey): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    unclear: { type: "boolean" },
    findings: {
      type: "array",
      items: { type: "object", properties: findingProps, required: Object.keys(findingProps), additionalProperties: false },
    },
  };
  if (readsOdometer(angleKey)) properties.odometer_km = { anyOf: [{ type: "integer" }, { type: "null" }] };
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}

/** The Messages API request for one photo: system rules, the image, the angle brief and a JSON schema. */
export function buildRequest(model: string, angleKey: AngleKey, jpegBase64: string): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: AI.maxTokens,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
          { type: "text", text: userPrompt(angleKey) },
        ],
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: responseJsonSchema(angleKey) },
      ...(AI.effort ? { effort: AI.effort } : {}),
    },
  };
}

const trimmedText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim().slice(0, max))
    .nullable()
    .default(null)
    .transform((s) => s || null);

const aiFindingSchema = z.object({
  type: z.enum(FINDING_TYPES),
  location: trimmedText(FINDING_LIMITS.locationChars),
  severity: z.enum(SEVERITIES),
  confidence: z.number().min(0).max(1),
  note: trimmedText(FINDING_LIMITS.noteChars),
});

/** An odometer above this is a misread, not a car. */
const MAX_PLAUSIBLE_KM = 2_000_000;

const analysisSchema = z.object({
  unclear: z.boolean(),
  findings: z.array(aiFindingSchema),
  odometer_km: z
    .number()
    .nullable()
    .optional()
    .transform((km) => (km == null || km < 0 || km > MAX_PLAUSIBLE_KM ? null : Math.round(km))),
});

export type AiFinding = z.infer<typeof aiFindingSchema>;

export type PhotoAnalysis = {
  unclear: boolean;
  /** Findings at or above the confidence threshold: these become findings rows. */
  findings: AiFinding[];
  /** Everything the model returned, including low-confidence findings, for the raw record. */
  allFindings: AiFinding[];
  /** Only for the odometer photo; null when it couldn't be read. */
  odometerKm: number | null;
};

export type ParseResult = { ok: true; analysis: PhotoAnalysis } | { ok: false; error: string };

/** Pulls the JSON object out of the reply, tolerating a ```json fence or stray words around it. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) throw new Error("No JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
}

/** Validates the model's reply and applies the confidence threshold. */
export function parseAnalysis(text: string, angleKey: AngleKey): ParseResult {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
  const parsed = analysisSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: z.prettifyError(parsed.error) };

  const { unclear, findings, odometer_km } = parsed.data;
  return {
    ok: true,
    analysis: {
      unclear,
      allFindings: findings,
      findings: findings.filter((f) => f.confidence >= AI.minConfidence).slice(0, AI.maxFindingsPerPhoto),
      odometerKm: readsOdometer(angleKey) ? odometer_km : null,
    },
  };
}
