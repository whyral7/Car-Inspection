import type { Metadata } from "next";
import { safeNextPath } from "@/lib/validation/auth";
import { t } from "@/lib/strings";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t.login.title };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-10">
      <p className="text-xl font-bold text-brand-700">{t.appName}</p>
      <LoginForm nextPath={nextPath} />
      <p className="mt-auto pt-10 text-center text-sm text-slate-500">{t.disclaimer}</p>
    </main>
  );
}
