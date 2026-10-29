import type { ReactNode } from "react";

/** Title block used at the top of each console screen. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </header>
  );
}

/** Inline notice for a failed load, with the API's own message. */
export function LoadError({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {error instanceof Error ? error.message : "Something went wrong. Please try again."}
    </p>
  );
}
