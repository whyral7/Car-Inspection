// The dealer's credit history, worked out from rows they can already read: the signup bonus, paid
// packs (+) and published reports (-1 each; publishing again is free, so one entry per report).

export type CreditEntry =
  | { kind: "welcome"; at: string; change: number }
  | { kind: "purchase"; at: string; change: number; amountPaise: number; paymentId: string | null }
  | { kind: "report"; at: string; change: -1; carLabel: string };

export type HistoryInput = {
  dealerCreatedAt: string;
  freeCredits: number;
  payments: readonly { status: string; credits: number; amount_paise: number; paid_at: string | null; created_at: string; razorpay_payment_id: string | null }[];
  reports: readonly { published_at: string | null; carLabel: string }[];
};

/** Newest first. Unpaid orders are left out. */
export function buildCreditHistory(input: HistoryInput): CreditEntry[] {
  const entries: CreditEntry[] = [{ kind: "welcome", at: input.dealerCreatedAt, change: input.freeCredits }];

  for (const p of input.payments) {
    if (p.status !== "paid") continue;
    entries.push({ kind: "purchase", at: p.paid_at ?? p.created_at, change: p.credits, amountPaise: p.amount_paise, paymentId: p.razorpay_payment_id });
  }
  for (const r of input.reports) {
    if (!r.published_at) continue;
    entries.push({ kind: "report", at: r.published_at, change: -1, carLabel: r.carLabel });
  }

  return entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export function totalBought(entries: readonly CreditEntry[]) {
  return entries.reduce((n, e) => (e.kind === "purchase" ? n + e.change : n), 0);
}

export function totalUsed(entries: readonly CreditEntry[]) {
  return entries.reduce((n, e) => (e.kind === "report" ? n + 1 : n), 0);
}
