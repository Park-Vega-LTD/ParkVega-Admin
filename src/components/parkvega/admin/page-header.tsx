import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";

/** Title block used at the top of each console screen. */
export function AdminPageHeader({
  title,
  description,
  actions,
  icon: Icon,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span
            className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary),var(--secondary)_45%)] text-deep shadow-[0_12px_24px_-14px_var(--primary)] sm:grid"
            aria-hidden="true"
          >
            <Icon className="size-6" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-deep">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions}
    </header>
  );
}

/** Inline notice for a failed load, with the API's own message. */
export function LoadError({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {error instanceof Error ? error.message : "Something went wrong. Please try again."}
    </p>
  );
}
