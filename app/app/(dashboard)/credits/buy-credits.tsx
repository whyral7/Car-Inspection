"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatIcon, CheckIcon, ClockIcon, ShieldCheckIcon, Spinner } from "@/components/icons";
import { Badge, Button, Card, FormError, LinkButton, StickyBar } from "@/components/ui";
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
  const [selected, setSelected] = useState(() => (packs.find((p) => p.best) ?? packs[0])?.key ?? "");
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
      <Card role="status" className="flex animate-rise-in items-center gap-4">
        <Spinner className="size-5 text-brand-700" />
        <p className="font-medium">{t.credits.confirming}</p>
      </Card>
    );
  }

  if (phase.kind === "success" || phase.kind === "slow") {
    const success = phase.kind === "success";
    return (
      <div className="flex flex-1 flex-col gap-6">
        <Card role="status" tone={success ? "success" : "warning"} className="flex animate-rise-in items-start gap-4">
          <span aria-hidden className={`flex size-10 shrink-0 animate-pop items-center justify-center rounded-full text-white ${success ? "bg-success-700" : "bg-warning-500"}`}>
            {success ? <CheckIcon size={22} /> : <ClockIcon size={22} />}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-heading">{success ? t.credits.successTitle : t.credits.slowTitle}</h2>
            <p className="text-ink-muted">{success ? t.credits.successBody(phase.added, phase.total) : t.credits.slowBody}</p>
          </div>
        </Card>
        <StickyBar>
          {phase.kind === "slow" && (
            <Button variant="secondary" onClick={() => checkAgain(phase.orderId)}>
              {t.credits.checkAgain}
            </Button>
          )}
          {next ? <LinkButton href={next}>{t.credits.backToReport}</LinkButton> : <LinkButton href="/app">{t.credits.backHome}</LinkButton>}
        </StickyBar>
      </div>
    );
  }

  const chosen = packs.find((p) => p.key === selected);
  return (
    <div className="flex flex-1 flex-col gap-4">
      {phase.kind === "failed" && (
        <Card role="alert" tone="danger" className="flex animate-rise-in flex-col gap-1 text-small text-danger-800">
          <p className="font-semibold">{t.credits.failedTitle}</p>
          <p>{t.credits.failedBody(phase.reason)}</p>
        </Card>
      )}
      {error && (
        <div className="flex flex-col gap-2">
          <FormError message={error} />
          <a
            href={supportHref}
            className="-mx-2 inline-flex min-h-11 items-center gap-2 self-start rounded-chip px-2 text-small font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            {...(supportHref.startsWith("https:") ? { target: "_blank", rel: "noopener" } : {})}
          >
            <ChatIcon size={18} />
            {t.credits.getHelp}
          </a>
        </div>
      )}
      <div role="radiogroup" aria-label={t.credits.title} className="flex flex-col gap-4">
        {packs.map((pack) => {
          const active = pack.key === selected;
          return (
            <button
              key={pack.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={phase.kind === "opening"}
              onClick={() => setSelected(pack.key)}
              className={`flex items-center gap-4 rounded-card bg-surface p-4 text-left shadow-card transition-[box-shadow,transform] duration-150 active:scale-[0.99] sm:p-6 ${
                active ? "ring-2 ring-brand-700" : "ring-1 ring-line"
              }`}
            >
              <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full ring-2 ring-inset ${active ? "bg-brand-700 ring-brand-700" : "ring-line-strong"}`}>
                {active && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-heading">{t.credits.pack(pack.credits)}</span>
                  {pack.best && <Badge tone="brand">{t.credits.bestValue}</Badge>}
                </span>
                <span className="text-small text-ink-muted">{t.credits.perReport(formatRupees(pack.perReportPaise))}</span>
              </span>
              <span className="shrink-0 text-heading tabular">₹{formatRupees(pack.pricePaise)}</span>
            </button>
          );
        })}
      </div>
      <p className="flex items-start justify-center gap-2 text-center text-caption text-ink-muted">
        <ShieldCheckIcon size={16} className="mt-px shrink-0" />
        {t.credits.secure}
      </p>
      <StickyBar>
        <Button loading={phase.kind === "opening"} disabled={!chosen} onClick={() => chosen && buy(chosen.key)}>
          {phase.kind === "opening" ? t.credits.opening : chosen ? t.credits.pay(formatRupees(chosen.pricePaise)) : t.credits.title}
        </Button>
      </StickyBar>
    </div>
  );
}
