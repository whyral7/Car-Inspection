import { describe, expect, it } from "vitest";
import { formatPhone, phoneDigits, reportUrl, telHref, whatsappChatUrl, whatsappShareUrl } from "./share";

describe("phoneDigits", () => {
  it("adds India's code to a 10-digit mobile and keeps numbers that have one", () => {
    expect(phoneDigits("9876543210")).toBe("919876543210");
    expect(phoneDigits("919876543210")).toBe("919876543210");
    expect(phoneDigits("+91 98765 43210")).toBe("919876543210");
    expect(phoneDigits("09876543210")).toBe("919876543210");
  });

  it("returns null for missing or too-short numbers", () => {
    expect(phoneDigits(null)).toBeNull();
    expect(phoneDigits("")).toBeNull();
    expect(phoneDigits("12345")).toBeNull();
  });
});

describe("contact links", () => {
  it("formats an Indian mobile for display", () => {
    expect(formatPhone("919876543210")).toBe("+91 98765 43210");
  });

  it("builds tel: and wa.me links", () => {
    expect(telHref("919876543210")).toBe("tel:+919876543210");
    expect(whatsappChatUrl("919876543210", "Hi, is it available?")).toBe("https://wa.me/919876543210?text=Hi%2C%20is%20it%20available%3F");
    expect(whatsappChatUrl(null, "Hi")).toBeNull();
  });

  it("encodes the share text, including the link", () => {
    const url = whatsappShareUrl("Swift (MH12AB1234) 8.4/10: https://x.in/r/abc?x=1&y=2");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.slice("https://wa.me/?text=".length))).toBe("Swift (MH12AB1234) 8.4/10: https://x.in/r/abc?x=1&y=2");
  });

  it("joins the base URL and slug without double slashes", () => {
    expect(reportUrl("https://treadmark.in/", "k7m2p9xa4c")).toBe("https://treadmark.in/r/k7m2p9xa4c");
    expect(reportUrl("http://localhost:3000", "k7m2p9xa4c")).toBe("http://localhost:3000/r/k7m2p9xa4c");
  });
});
