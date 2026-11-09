import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/validation/auth";
import { getT } from "@/lib/i18n.server";
import { LanguageToggle } from "@/components/language-toggle";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" aria-label={t.appName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG; small lockup suits a page header */}
          <img src="/brand/treadmark-lockup-small-color.svg" alt={t.appName} width={136} height={28} className="h-7 w-auto" />
        </Link>
        <LanguageToggle />
      </div>
      <LoginForm nextPath={nextPath} />
      <p className="mt-6 text-center text-sm text-text-subtle">
        {t.login.agree}{" "}
        <Link href="/terms" className="font-medium text-accent underline">
          {t.login.terms}
        </Link>{" "}
        {t.login.and}{" "}
        <Link href="/privacy" className="font-medium text-accent underline">
          {t.login.privacy}
        </Link>
        {t.login.agreeEnd}
      </p>
      <p className="mt-auto pt-10 text-center text-sm text-text-subtle">{t.disclaimer}</p>
    </main>
  );
}
