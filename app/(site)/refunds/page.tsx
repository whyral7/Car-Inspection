import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { BUSINESS } from "@/lib/config";
import { legal } from "@/lib/strings-legal";

const copy = legal.refunds;

export const metadata: Metadata = { title: copy.title, alternates: { canonical: "/refunds" } };

export default function RefundsPage() {
  return <LegalPage title={copy.title} intro={copy.intro(BUSINESS)} sections={copy.sections(BUSINESS)} />;
}
