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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="flex min-h-11 items-center gap-2 type-heading-2 text-accent" aria-label={`${t.appName}: ${t.common.goToSite}`}>
          <span aria-hidden className="flex size-8 items-center justify-center rounded-sm bg-accent type-body-sm text-white">
            T
          </span>
          {t.appName}
        </Link>
        <LanguageToggle />
      </div>
      <LoginForm nextPath={nextPath} />
      <p className="-mt-4 text-center type-body-sm leading-10 text-text-muted">
        {t.login.agree}{" "}
        <Link href="/terms" className="py-2.5 font-semibold text-accent underline">
          {t.login.terms}
        </Link>{" "}
        {t.login.and}{" "}
        <Link href="/privacy" className="py-2.5 font-semibold text-accent underline">
          {t.login.privacy}
        </Link>
        .
      </p>
      <p className="mt-auto text-center type-caption text-balance text-text-muted">{t.disclaimer}</p>
    </main>
  );
}
