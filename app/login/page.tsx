import type { Metadata } from "next";
import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { getT } from "@/lib/i18n.server";
import { safeNextPath } from "@/lib/validation/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getT();
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-heading font-bold text-brand-700" aria-label={`${t.appName}: ${t.common.goToSite}`}>
          <span aria-hidden className="flex size-8 items-center justify-center rounded-chip bg-brand-700 text-small text-white">
            T
          </span>
          {t.appName}
        </Link>
        <LanguageToggle />
      </div>
      <LoginForm nextPath={nextPath} />
      <p className="mt-4 text-center text-small leading-10 text-ink-muted">
        {t.login.agree}{" "}
        <Link href="/terms" className="py-2.5 font-semibold text-brand-700 underline">
          {t.login.terms}
        </Link>{" "}
        {t.login.and}{" "}
        <Link href="/privacy" className="py-2.5 font-semibold text-brand-700 underline">
          {t.login.privacy}
        </Link>
        .
      </p>
      <p className="mt-auto pt-8 text-center text-small text-ink-muted">{t.disclaimer}</p>
    </main>
  );
}
