"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/button";
import { Field, FormError } from "@/components/field";
import { OTP_RESEND_SECONDS } from "@/lib/config";
import { useT } from "@/components/i18n-provider";
import { errorText } from "@/lib/i18n";
import type { Strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import { indianMobileSchema, otpSchema } from "@/lib/validation/auth";

type Step = "phone" | "otp";

function authErrorMessage(t: Strings, error: { status?: number; code?: string }, fallback: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return t.common.offline;
  if (error.status === 429 || error.code === "over_sms_send_rate_limit") return t.login.errors.tooMany;
  return fallback;
}

function formatPhone(e164: string) {
  const d = e164.slice(3);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState(""); // E.164, set once the OTP is sent
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  // Android Chrome can read the code from the SMS (WebOTP) when the SMS ends with "@<domain> #<code>".
  useEffect(() => {
    if (step !== "otp" || !("OTPCredential" in window)) return;
    const abort = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: abort.signal } as CredentialRequestOptions)
      .then((credential) => {
        const code = (credential as (Credential & { code?: string }) | null)?.code;
        if (code) void verify(code);
      })
      .catch(() => {
        // Cancelled, unsupported or timed out: the user types the code instead.
      });
    return () => abort.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per OTP step
  }, [step, phone]);

  async function sendOtp(target: string) {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ phone: target });
    setPending(false);
    if (error) {
      setError(authErrorMessage(t, error, t.login.errors.sendFailed));
      return false;
    }
    setResendIn(OTP_RESEND_SECONDS);
    return true;
  }

  async function onPhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = indianMobileSchema.safeParse(phoneInput);
    if (!parsed.success) {
      setFieldError(errorText(t, parsed.error.issues[0]?.message));
      return;
    }
    setFieldError(undefined);
    if (await sendOtp(parsed.data)) {
      setPhone(parsed.data);
      setOtp("");
      setStep("otp");
    }
  }

  async function onOtpSubmit(e: FormEvent) {
    e.preventDefault();
    await verify(otp);
  }

  async function verify(code: string) {
    if (pending) return;
    setOtp(code.replace(/\D/g, "").slice(0, 6));
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setFieldError(errorText(t, parsed.error.issues[0]?.message));
      return;
    }
    setFieldError(undefined);
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ phone, token: parsed.data, type: "sms" });
    if (error) {
      setPending(false);
      setError(authErrorMessage(t, error, t.login.errors.wrongOtp));
      // Clear the wrong code so the next attempt starts fresh.
      setOtp("");
      otpRef.current?.focus();
      return;
    }
    // Keep the spinner while the protected page loads.
    router.replace(nextPath);
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form onSubmit={onPhoneSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <div>
          <h1 className="text-2xl font-bold">{t.login.title}</h1>
          <p className="mt-1 text-slate-600">{t.login.subtitle}</p>
        </div>
        <Field
          label={t.login.phoneLabel}
          name="phone"
          prefix="+91"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={t.login.phonePlaceholder}
          maxLength={14}
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          error={fieldError}
          autoFocus
          required
        />
        <FormError message={error} />
        <Button type="submit" loading={pending}>
          {t.login.sendOtp}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onOtpSubmit} className="mt-8 flex flex-col gap-5" noValidate>
      <div>
        <h1 className="text-2xl font-bold">{t.login.otpTitle}</h1>
        <p className="mt-1 text-slate-600">{t.login.otpSentTo(formatPhone(phone))}</p>
      </div>
      <Field
        ref={otpRef}
        label={t.login.otpLabel}
        name="otp"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        className="[&_input]:text-center [&_input]:text-2xl [&_input]:tracking-[0.5em]"
        value={otp}
        onChange={(e) => {
          const code = e.target.value.replace(/\D/g, "").slice(0, 6);
          setOtp(code);
          setError(null);
          // Six digits is a complete code: verify without another tap.
          if (code.length === 6) void verify(code);
        }}
        error={fieldError}
        required
      />
      <FormError message={error} />
      <Button type="submit" loading={pending}>
        {t.login.verify}
      </Button>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="px-2 text-sm whitespace-nowrap"
          onClick={() => {
            setStep("phone");
            setError(null);
            setFieldError(undefined);
          }}
        >
          {t.login.changeNumber}
        </Button>
        <Button type="button" variant="ghost" className="px-2 text-sm whitespace-nowrap" disabled={resendIn > 0 || pending} onClick={() => sendOtp(phone)}>
          {resendIn > 0 ? t.login.resendIn(resendIn) : t.login.resend}
        </Button>
      </div>
    </form>
  );
}
