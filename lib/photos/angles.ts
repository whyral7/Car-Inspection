// The 20 guided photo angles, in capture order. Labels and tips live in lib/strings.ts.

export const ANGLE_KEYS = [
  "front",
  "front_left",
  "left",
  "rear_left",
  "rear",
  "rear_right",
  "right",
  "front_right",
  "engine",
  "chassis",
  "odometer",
  "dashboard",
  "front_seats",
  "rear_seats",
  "boot",
  "spare",
  "tyre_fl",
  "tyre_fr",
  "tyre_rl",
  "tyre_rr",
] as const;
export type AngleKey = (typeof ANGLE_KEYS)[number];

/** Which outline drawing to show; several angles share one (mirrored where needed). */
export type HintKind =
  | "front"
  | "rear"
  | "corner_front"
  | "corner_rear"
  | "side"
  | "engine"
  | "chassis"
  | "odometer"
  | "dashboard"
  | "front_seats"
  | "rear_seats"
  | "boot"
  | "spare"
  | "tyre";

export type Angle = {
  key: AngleKey;
  /** 1-based position shown to the dealer. */
  number: number;
  required: boolean;
  hint: HintKind;
  /** Mirror the drawing horizontally (left vs right variants). */
  flip: boolean;
  /** For tyre photos: which wheel, so the hint can highlight it on a top-down car. */
  corner?: "fl" | "fr" | "rl" | "rr";
};

/** Angles 1-12 are required before the inspection can move on; 13-20 are optional. */
export const REQUIRED_ANGLE_COUNT = 12;

const SHAPES: Record<AngleKey, Pick<Angle, "hint" | "flip" | "corner">> = {
  front: { hint: "front", flip: false },
  front_left: { hint: "corner_front", flip: false },
  left: { hint: "side", flip: false },
  rear_left: { hint: "corner_rear", flip: false },
  rear: { hint: "rear", flip: false },
  rear_right: { hint: "corner_rear", flip: true },
  right: { hint: "side", flip: true },
  front_right: { hint: "corner_front", flip: true },
  engine: { hint: "engine", flip: false },
  chassis: { hint: "chassis", flip: false },
  odometer: { hint: "odometer", flip: false },
  dashboard: { hint: "dashboard", flip: false },
  front_seats: { hint: "front_seats", flip: false },
  rear_seats: { hint: "rear_seats", flip: false },
  boot: { hint: "boot", flip: false },
  spare: { hint: "spare", flip: false },
  tyre_fl: { hint: "tyre", flip: false, corner: "fl" },
  tyre_fr: { hint: "tyre", flip: false, corner: "fr" },
  tyre_rl: { hint: "tyre", flip: false, corner: "rl" },
  tyre_rr: { hint: "tyre", flip: false, corner: "rr" },
};

export const ANGLES: readonly Angle[] = ANGLE_KEYS.map((key, i) => ({
  key,
  number: i + 1,
  required: i < REQUIRED_ANGLE_COUNT,
  ...SHAPES[key],
}));

export function isAngleKey(value: string): value is AngleKey {
  return (ANGLE_KEYS as readonly string[]).includes(value);
}

/** Where a photo lives inside the private `inspection-photos` bucket. */
export function photoPath(carId: string, angleKey: AngleKey) {
  return `cars/${carId}/${angleKey}.jpg`;
}

/** The small copy used by the report gallery and PDF. */
export function smallPhotoPath(carId: string, angleKey: AngleKey) {
  return `cars/${carId}/small/${angleKey}.jpg`;
}

export type PhotoProgress = {
  /** Photos stored, out of ANGLES.length. */
  done: number;
  total: number;
  requiredDone: number;
  requiredTotal: number;
  allRequiredDone: boolean;
};

export function photoProgress(savedKeys: Iterable<string>): PhotoProgress {
  const saved = new Set(savedKeys);
  const done = ANGLES.filter((a) => saved.has(a.key)).length;
  const requiredDone = ANGLES.filter((a) => a.required && saved.has(a.key)).length;
  return {
    done,
    total: ANGLES.length,
    requiredDone,
    requiredTotal: REQUIRED_ANGLE_COUNT,
    allRequiredDone: requiredDone === REQUIRED_ANGLE_COUNT,
  };
}

/** Index of the first angle with no photo, or -1 when every angle is covered. */
export function firstMissingIndex(coveredKeys: Iterable<string>) {
  const covered = new Set(coveredKeys);
  return ANGLES.findIndex((a) => !covered.has(a.key));
}
