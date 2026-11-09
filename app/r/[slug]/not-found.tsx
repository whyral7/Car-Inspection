import { t } from "@/lib/strings";

export default function ReportNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-10 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
      <img src="/brand/treadmark-mark-small-color.svg" alt="" width={56} height={56} className="mx-auto size-14" />
      <h1 className="type-heading-1">{t.publicReport.notFoundTitle}</h1>
      <p className="text-text-muted">{t.publicReport.notFoundBody}</p>
    </main>
  );
}
