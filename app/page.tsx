import { LinkButton } from "@/components/button";
import { t } from "@/lib/strings";

// Placeholder. The full landing page is built in Phase 6.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold text-brand-700">{t.appName}</h1>
        <p className="mt-2 text-lg text-slate-600">{t.tagline}</p>
      </div>
      <LinkButton href="/login">{t.home.login}</LinkButton>
      <p className="text-sm text-slate-500">{t.disclaimer}</p>
    </main>
  );
}
