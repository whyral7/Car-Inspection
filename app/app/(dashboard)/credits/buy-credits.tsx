"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui";
import { FormError } from "@/components/ui";
import { ChatIcon, CheckIcon, ClockIcon } from "@/components/icons";
import { THEME_COLOR } from "@/lib/config";
import { formatRupees } from "@/lib/format";
import { loadCheckout } from "@/lib/razorpay/checkout";
import { useT } from "@/components/i18n-provider";
import { createCreditOrder, getOrderStatus } from "./actions";

type Pack = { key: string; credits: number; pricePaise: number; perReportPaise: number; best: boolean };

type Phase =
  | { kind: "idle" }
  | { kind: "opening"; packKey: string }
  | { kind: "confirming"; orderId: string }
  | { kind: "success"; added: number; total: number }
  | { kind: "slow"; orderId: string }
  | { kind: "failed"; reason: string | null };

/** How long to wait for the webhook after Checkout reports success before saying "it's on its way". */
const POLL_MS = 2000;
const POLL_TRIES = 15;

export function BuyCredits({ packs, next, supportHref }: { packs: Pack[]; next: string | null; supportHref: string }) {
  const t = useT();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  async function waitForCredits(orderId: string) {
    setPhase({ kind: "confirming", orderId });
    for (let i = 0; i < POLL_TRIES && alive.current; i++) {
      const res = await getOrderStatus(orderId).catch(() => null);
      if (res?.status === "paid") {
        setPhase({ kind: "success", added: res.creditsAdded, total: res.credits });
        router.refresh(); // header badge
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    if (alive.current) setPhase({ kind: "slow", orderId });
  }

  async function checkAgain(orderId: string) {
    const res = await getOrderStatus(orderId).catch(() => null);
    if (res?.status === "paid") {
      setPhase({ kind: "success", added: res.creditsAdded, total: res.credits });
      router.refresh();
    }
  }

  async function buy(packKey: string) {
    setError(null);
    setPhase({ kind: "opening", packKey });

    const [order, Razorpay] = await Promise.all([
      // A thrown call means the request never got an answer: the phone's connection, not our server.
      createCreditOrder(packKey).catch(() => ({ ok: false as const, error: navigator.onLine ? t.credits.errors.start : t.common.offline })),
      loadCheckout().catch(() => null),
    ]);
    if (!order.ok) {
      setError(order.error);
      setPhase({ kind: "idle" });
      return;
    }
    if (!Razorpay) {
      setError(t.credits.errors.script);
      setPhase({ kind: "idle" });
      return;
    }

    let lastFailure: string | null = null;
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: order.name,
      description: order.description,
      image: `${window.location.origin}/icons/icon-192.png`,
      prefill: order.prefill,
      theme: { color: THEME_COLOR },
      retry: { enabled: true },
      // Checkout's own success callback. It proves nothing on its own: we wait for the webhook to credit.
      handler: () => void waitForCredits(order.orderId),
      modal: {
        ondismiss: () => setPhase(lastFailure ? { kind: "failed", reason: lastFailure } : { kind: "idle" }),
      },
    });
    // Fires for each failed attempt; Checkout stays open so the dealer can retry with another method.
    checkout.on("payment.failed", (res) => {
      lastFailure = res.error.description ?? null;
    });
    checkout.open();
  }

  if (phase.kind === "confirming") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-card border border-line bg-surface p-5">
        <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
        <p className="font-medium">{t.credits.confirming}</p>
      </div>
    );
  }

  if (phase.kind === "success" || phase.kind === "slow") {
    const success = phase.kind === "success";
    return (
      <div role="status" className={`flex flex-col gap-4 rounded-card p-5 ${success ? "bg-success-50" : "bg-warning-50"}`}>
        <div className="flex items-start gap-3">
          <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-full text-title text-white ${success ? "bg-success-700" : "bg-warning-500"}`}>
            {success ? <CheckIcon size={22} /> : <ClockIcon size={22} />}
          </span>
          <div>
            <h2 className="text-heading font-bold">{success ? t.credits.successTitle : t.credits.slowTitle}</h2>
            <p className="text-ink-muted">{success ? t.credits.successBody(phase.added, phase.total) : t.credits.slowBody}</p>
          </div>
        </div>
        {phase.kind === "slow" && (
          <Button variant="secondary" onClick={() => checkAgain(phase.orderId)}>
            {t.credits.checkAgain}
          </Button>
        )}
        {next ? <LinkButton href={next}>{t.credits.backToReport}</LinkButton> : <LinkButton href="/app">{t.credits.backHome}</LinkButton>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {phase.kind === "failed" && (
        <div role="alert" className="rounded-card bg-danger-50 p-4 text-small text-danger-800">
          <p className="font-semibold">{t.credits.failedTitle}</p>
          <p>{t.credits.failedBody(phase.reason)}</p>
        </div>
      )}
      {error && (
        <div className="flex flex-col gap-2">
          <FormError message={error} />
          <a href={supportHref} className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-brand-700" {...(supportHref.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}>
            <ChatIcon size={18} />
            {t.credits.getHelp}
          </a>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {packs.map((pack) => {
          const opening = phase.kind === "opening" && phase.packKey === pack.key;
          return (
            <li key={pack.key} className={`rounded-card border bg-surface p-4 ${pack.best ? "border-brand-600 ring-1 ring-brand-600" : "border-line"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-heading font-bold">{t.credits.pack(pack.credits)}</p>
                  <p className="text-small text-ink-muted">{t.credits.perReport(formatRupees(pack.perReportPaise))}</p>
                </div>
                {pack.best && <span className="rounded-full bg-brand-100 px-2.5 py-1 text-caption font-semibold text-brand-800">{t.credits.bestValue}</span>}
              </div>
              <Button className="mt-3 w-full" loading={opening} disabled={phase.kind === "opening"} onClick={() => buy(pack.key)}>
                {opening ? t.credits.opening : t.credits.pay(formatRupees(pack.pricePaise))}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-caption text-ink-muted">{t.credits.secure}</p>
    </div>
  );
}
