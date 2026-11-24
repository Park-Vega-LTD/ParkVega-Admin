import type { Metadata } from "next";
import { ShieldCheck, BarChart3, Users, CalendarCheck } from "lucide-react";

import { Logo } from "@/components/parkvega/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Staff login | Park Vega Admin",
  description: "Sign in to the Park Vega staff console.",
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Bookings & gate check-in",
    description: "View, manage and validate tickets in real time.",
    accent: "text-primary" as const,
  },
  {
    icon: BarChart3,
    title: "Revenue & analytics",
    description: "Daily sales, attendance trends and food-order revenue.",
    accent: "text-coral" as const,
  },
  {
    icon: Users,
    title: "Staff management",
    description: "Invite team members and control role-based access.",
    accent: "text-primary" as const,
  },
  {
    icon: ShieldCheck,
    title: "Secure admin console",
    description: "Every action is logged and scoped to your role.",
    accent: "text-coral" as const,
  },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1">
      {/* ── Left panel ── */}
      <div
        className="relative hidden lg:flex lg:w-5/12 xl:w-[480px] shrink-0"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.739 0.139 224.2 / 0.9) 0%, oklch(0.758 0.214 134.6 / 0.7) 25%, oklch(0.723 0.174 34.1 / 0.8) 55%, oklch(0.739 0.139 224.2 / 0.6) 80%, oklch(0.758 0.214 134.6 / 0.5) 100%)",
          padding: "1.5px",
        }}
      >
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden bg-deep p-10">
        {/* Background glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-[400px] w-[400px] rounded-full bg-primary opacity-25 blur-[100px]"
        />
        {/* Lime / lemon-green glow — bottom-right and top-centre */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 h-[460px] w-[460px] rounded-full bg-secondary opacity-35 blur-[80px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/3 h-[200px] w-[200px] rounded-full bg-secondary opacity-20 blur-[60px]"
        />
        {/* Coral / orange glow — centre-right, clearly visible */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 -right-20 h-[420px] w-[420px] rounded-full bg-coral opacity-35 blur-[80px]"
        />
        {/* Secondary coral splash near bottom-left */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-20 -left-10 h-[220px] w-[220px] rounded-full bg-coral opacity-20 blur-[60px]"
        />

        {/* Logo */}
        <div className="relative">
          <Logo size="sm" tone="onDark" />
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Staff Console
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-white">
              Run the park
              <br />
              <span className="text-primary">from one </span>
              <span className="text-coral">place.</span>
            </h1>
            <p className="text-sm leading-relaxed text-white/50">
              Everything your team needs to manage bookings, content and
              operations at Park Vega.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, description, accent }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className={`size-4 ${accent}`} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-white/45">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative text-xs text-white/25">
          Authorised Park Vega staff only
        </p>
      </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col bg-muted">
        {/* Top bar */}
        <div className="flex items-center justify-end px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Park Vega Admin
          </span>
        </div>

        {/* Form centred in remaining space */}
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">
            {/* Mobile logo — only shown below lg */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo size="sm" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
