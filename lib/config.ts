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
} as const;

export const OTP_RESEND_SECONDS = 30;
