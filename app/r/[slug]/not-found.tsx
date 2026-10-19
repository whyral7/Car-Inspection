import { t } from "@/lib/strings";

export default function ReportNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-10 text-center">
      <span className="text-5xl" aria-hidden>
        🔍
      </span>
      <h1 className="text-xl font-bold">{t.publicReport.notFoundTitle}</h1>
      <p className="text-slate-600">{t.publicReport.notFoundBody}</p>
    </main>
  );
}
