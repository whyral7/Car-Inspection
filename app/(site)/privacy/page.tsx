import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";
import { BUSINESS } from "@/lib/config";
import { legal } from "@/lib/strings-legal";

const copy = legal.privacy;

export const metadata: Metadata = { title: copy.title, alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <LegalPage title={copy.title} intro={copy.intro(BUSINESS)} sections={copy.sections(BUSINESS)} />;
}
