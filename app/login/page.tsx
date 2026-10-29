import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/validation/auth";
import { getT } from "@/lib/i18n.server";
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
      <p className="text-xl font-bold text-brand-700">{t.appName}</p>
      <LoginForm nextPath={nextPath} />
      <p className="mt-6 text-center text-sm text-slate-500">
        {t.login.agree}{" "}
        <Link href="/terms" className="font-medium text-brand-700 underline">
          {t.login.terms}
        </Link>{" "}
        {t.login.and}{" "}
        <Link href="/privacy" className="font-medium text-brand-700 underline">
          {t.login.privacy}
        </Link>
        .
      </p>
      <p className="mt-auto pt-10 text-center text-sm text-slate-500">{t.disclaimer}</p>
    </main>
  );
}
