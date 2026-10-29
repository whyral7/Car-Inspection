import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { ToastProvider } from "@/components/ui";
import { getLocale } from "@/lib/i18n.server";

/** Wraps a dynamic section (app, login, public report) in the visitor's language. */
export async function LocaleRoot({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale}>
      <ToastProvider>
        <div lang={locale} className="flex flex-1 flex-col">
          {children}
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}
