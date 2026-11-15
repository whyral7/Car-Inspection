import type { ReactNode } from "react";

/** Centred message for not-found, error and offline screens, with the next step underneath. */
export function StatusPage({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 animate-fade-in flex-col items-center justify-center px-4 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-md bg-surface-sunken text-text">{icon}</span>
      <h1 className="mt-6 type-heading-1">{title}</h1>
      <p className="mt-2 text-text-muted">{body}</p>
      {children && <div className="mt-8 flex w-full flex-col gap-2">{children}</div>}
    </div>
  );
}
