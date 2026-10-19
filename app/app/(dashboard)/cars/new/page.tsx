import { LinkButton } from "@/components/button";
import { t } from "@/lib/strings";

// Placeholder so the "Add car" button works. Replaced in Phase 2.
export default function NewCarPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-xl font-bold">{t.comingSoon.title}</h1>
      <p className="text-slate-600">{t.comingSoon.body}</p>
      <LinkButton href="/app" variant="secondary">
        {t.common.back}
      </LinkButton>
    </div>
  );
}
