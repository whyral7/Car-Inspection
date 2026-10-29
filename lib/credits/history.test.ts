import { describe, expect, it } from "vitest";
import { buildCreditHistory, totalBought, totalUsed } from "./history";

const payment = (over: Partial<Parameters<typeof buildCreditHistory>[0]["payments"][number]> = {}) => ({
  status: "paid",
  credits: 10,
  amount_paise: 99900,
  paid_at: "2026-10-20T10:00:00.000+00:00",
  created_at: "2026-10-20T09:59:00.000+00:00",
  razorpay_payment_id: "pay_1",
  ...over,
});

describe("buildCreditHistory", () => {
  const entries = buildCreditHistory({
    dealerCreatedAt: "2026-10-19T13:11:36.671748+00:00",
    freeCredits: 3,
    payments: [payment(), payment({ status: "created", razorpay_payment_id: null, paid_at: null }), payment({ status: "failed" })],
    reports: [
      { published_at: "2026-10-21T08:00:00+00:00", carLabel: "MH12AB1234" },
      { published_at: null, carLabel: "draft" },
      { published_at: "2026-10-19T15:00:00+00:00", carLabel: "KA01CD5678" },
    ],
  });

  it("lists the signup bonus, paid packs and published reports, newest first", () => {
    expect(entries.map((e) => [e.kind, e.change])).toEqual([
      ["report", -1],
      ["purchase", 10],
      ["report", -1],
      ["welcome", 3],
    ]);
  });

  it("leaves out unpaid orders and unpublished reports", () => {
    expect(totalBought(entries)).toBe(10);
    expect(totalUsed(entries)).toBe(2);
  });
});
