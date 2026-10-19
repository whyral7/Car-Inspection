import { LinkButton } from "@/components/button";
import { t } from "@/lib/strings";

// Placeholder so "Start inspection" works. Replaced in Phase 3.
export default async function InspectPage({ params }: PageProps<"/app/cars/[id]/inspect">) {
  const { id } = await params;
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-xl font-bold">{t.comingSoon.title}</h1>
      <p className="text-slate-600">{t.comingSoon.body}</p>
      <LinkButton href={`/app/cars/${id}`} variant="secondary">
        {t.common.back}
      </LinkButton>
    </div>
  );
}
