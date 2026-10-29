// Links for sharing a report and contacting the dealer. wa.me and tel: work in every phone browser,
// including WhatsApp's own in-app browser.

/** The dealer's number as international digits (91XXXXXXXXXX), or null if it doesn't look like a phone number. */
export function phoneDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** "+91 98765 43210" for Indian mobiles, "+<digits>" otherwise. */
export function formatPhone(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

export function telHref(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

/** Opens WhatsApp with `text` ready to send to a chat the user picks. */
export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Opens a WhatsApp chat with the dealer with `text` typed in. */
export function whatsappChatUrl(phone: string | null | undefined, text: string): string | null {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

export function reportPath(slug: string) {
  return `/r/${slug}`;
}

export function reportUrl(baseUrl: string, slug: string) {
  return `${baseUrl.replace(/\/+$/, "")}${reportPath(slug)}`;
}

export function reportPdfPath(slug: string) {
  return `/r/${slug}/pdf`;
}
