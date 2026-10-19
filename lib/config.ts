export const APP_NAME = "CarParakh";
export const THEME_COLOR = "#0f766e";
export const BACKGROUND_COLOR = "#ffffff";

export const FREE_CREDITS = 3;

export const STORAGE_BUCKETS = {
  logos: "logos",
  inspectionPhotos: "inspection-photos",
} as const;

export const LOGO = {
  maxBytes: 2 * 1024 * 1024,
  maxEdgePx: 512,
  mimeTypes: ["image/png", "image/jpeg", "image/webp"],
} as const;

export const PHOTO = {
  maxEdgePx: 1600,
  jpegQuality: 0.8,
  /** Extra upload attempts after the first one fails (waits 1s, 2s, 4s between them). */
  uploadRetries: 3,
  retryBaseDelayMs: 1000,
  /** Give up on a single request after this long, so a stalled 4G connection becomes a retry. */
  uploadTimeoutMs: 45_000,
  /** Bucket limit is 5 MB; a 1600px JPEG is normally well under 1 MB. */
  maxBytes: 5 * 1024 * 1024,
  /** How long thumbnails on the inspect screen stay valid before the page needs a refresh. */
  signedUrlSeconds: 2 * 60 * 60,
} as const;

export const OTP_RESEND_SECONDS = 30;

export const AI = {
  /** Photos analysed at the same time from the review screen. */
  concurrency: 4,
  /** Findings the model is less sure about than this are dropped (kept in the raw output). */
  minConfidence: 0.5,
  maxFindingsPerPhoto: 20,
  maxTokens: 4096,
  /**
   * Thinking effort for the vision call. "low" keeps cost and latency down for a look-and-describe
   * task; raise it if notes look careless. Set to null for models without effort (e.g. Haiku 4.5).
   */
  effort: "low" as "low" | "medium" | "high" | null,
  /** Per API request; the SDK retries timeouts and 429/5xx this many extra times. */
  requestTimeoutMs: 40_000,
  apiRetries: 1,
  /** Cap on model calls per photo per day, so a stuck retry loop can't run up the bill. */
  maxCallsPerPhotoPerDay: 10,
} as const;
