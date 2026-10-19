export const APP_NAME = "CarParakh";
export const THEME_COLOR = "#0f766e";
export const BACKGROUND_COLOR = "#ffffff";

export const FREE_CREDITS = 3;

export const STORAGE_BUCKETS = {
  logos: "logos",
  inspectionPhotos: "inspection-photos",
  reports: "reports",
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
  /** Small copy uploaded next to each photo for the report gallery and PDF (about 60 KB). */
  smallEdgePx: 640,
  smallJpegQuality: 0.75,
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

export const REPORT = {
  /** Random characters in a public link (/r/<slug>): 32^10 is about 10^15, far too many to guess. */
  slugLength: 10,
  /** Photo links on the public report and the preview. The page makes fresh ones on every visit. */
  photoUrlSeconds: 24 * 60 * 60,
  /** PDF download links. /r/<slug>/pdf makes a fresh one on every tap. */
  pdfUrlSeconds: 5 * 60,
  /** Bump when the PDF layout changes, so stored PDFs are rebuilt on the next download. */
  pdfVersion: 1,
} as const;

/** Prepaid report credit packs. Prices in paise (Rs 999 = 99900). */
export const CREDIT_PACKS = [
  { key: "pack_10", credits: 10, pricePaise: 99_900 },
  { key: "pack_30", credits: 30, pricePaise: 249_900 },
] as const;

/**
 * Your business details for the landing, contact and legal pages. Replace every [bracket] before going
 * live: Razorpay reviews these pages (contact details, terms, privacy, refunds) when activating live payments.
 */
export const BUSINESS = {
  legalName: "[Your registered business name]",
  address: "[Registered address, City, State, PIN code]",
  /** Courts of this city have jurisdiction under the terms. */
  city: "[City]",
  email: "[support@yourdomain.com]",
  /** WhatsApp number for "Chat on WhatsApp", digits with country code (e.g. "919876543210"). Empty: those buttons open /contact. */
  whatsapp: "",
  supportHours: "[Monday to Saturday, 10 am to 7 pm IST]",
  /** Named contact for privacy complaints (required under India's DPDP Act). */
  grievanceOfficer: "[Name of grievance officer]",
  legalUpdated: "19 October 2026",
} as const;

/** Public sample report linked from the landing page. Set to a real published slug (e.g. "/r/abcd1234ef") to show your own. */
export const SAMPLE_REPORT_PATH = "/sample-report";
