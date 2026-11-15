import type { Metadata } from "next";
import Link from "next/link";
import { BrandHeader } from "@/components/brand-header";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <BrandHeader plain homeLabel={`${t.appName}: ${t.common.goToSite}`} />
      <LoginForm nextPath={nextPath} />
      <p className="-mt-4 text-center type-body-sm text-text-muted">
        {t.login.agree}{" "}
        <Link href="/terms" className="inline-flex min-h-11 items-center type-label text-accent underline underline-offset-4">
          {t.login.terms}
        </Link>{" "}
        {t.login.and}{" "}
        <Link href="/privacy" className="inline-flex min-h-11 items-center type-label text-accent underline underline-offset-4">
          {t.login.privacy}
        </Link>
        .
      </p>
      <p className="mt-auto text-center type-caption text-balance text-text-muted">{t.disclaimer}</p>
    </main>
  );
}
