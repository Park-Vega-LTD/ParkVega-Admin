import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CalendarDays,
  ChefHat,
  HelpCircle,
  Home,
  MessageSquare,
  Newspaper,
  ScanLine,
  Sparkles,
  TreePalm,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { serverFetch } from "@/lib/api.server";
import { canAccess, getSessionRole } from "@/lib/session";
import type { Attraction, Booking, Event, Restaurant } from "@/types/api";

// SSR: the admin overview reflects live operational counts that change as
// admins and visitors mutate data, so render on every request rather than
// caching (Requirement 11.1).
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    // Title: 31 chars (<= 60)
    title: "Admin | Park Vega Waterpark",
    // Description: 118 chars (<= 160)
    description:
      "Park Vega admin overview—at-a-glance counts of attractions, events, bookings and restaurants across the park.",
  };
}

const fetchOpts = { cache: "no-store" } as const;

/** A single count card descriptor rendered on the overview grid. */
interface CountCard {
  label: string;
  count: number;
  description: string;
  icon: LucideIcon;
  href: string;
  /** Tailwind classes for the icon tile. */
  tone: string;
}

/** Shortcuts to the screens staff use most. */
const SHORTCUTS: { label: string; description: string; href: string; icon: LucideIcon }[] = [
  { label: "Homepage & visit", description: "Hero, opening hours and visit info", href: "/admin/settings", icon: Home },
  { label: "Write a blog post", description: "News and stories for the site", href: "/admin/blog", icon: Newspaper },
  { label: "FAQs", description: "Questions at the foot of each page", href: "/admin/faqs", icon: HelpCircle },
  { label: "Enquiries", description: "Messages from the contact forms", href: "/admin/enquiries", icon: MessageSquare },
  { label: "Food orders", description: "Live kitchen board", href: "/admin/food-orders", icon: ChefHat },
  { label: "Gate scanner", description: "Check tickets in at the gate", href: "/staff/gate", icon: ScanLine },
];

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminOverviewPage() {
  // Fetch every summary collection in parallel. Each fetch degrades to an empty
  // list on failure so a single unreachable endpoint never crashes the whole
  // overview — the affected card simply shows 0.
  const [role, attractions, events, bookings, restaurants] = await Promise.all([
    getSessionRole(),
    serverFetch<Attraction[]>("/attractions", fetchOpts).catch(() => [] as Attraction[]),
    serverFetch<Event[]>("/events", fetchOpts).catch(() => [] as Event[]),
    serverFetch<Booking[]>("/bookings", fetchOpts).catch(() => [] as Booking[]),
    serverFetch<Restaurant[]>("/restaurants", fetchOpts).catch(() => [] as Restaurant[]),
  ]);

  // `serverFetch` unwraps the `{ data, meta }` Envelope and returns `data`
  // (the collection array), so counts are derived from the array length.
  const cards: CountCard[] = [
    {
      label: "Attractions",
      count: attractions.length,
      description: "Rides, pools and zones",
      icon: TreePalm,
      href: "/admin/attractions",
      tone: "bg-secondary/15 text-[color-mix(in_oklab,var(--secondary),var(--deep)_45%)]",
    },
    {
      label: "Events",
      count: events.length,
      description: "Scheduled events and special days",
      icon: CalendarDays,
      href: "/admin/events",
      tone: "bg-accent/30 text-[color-mix(in_oklab,var(--accent),var(--deep)_55%)]",
    },
    {
      label: "Bookings",
      count: bookings.length,
      description: "Ticket bookings by visitors",
      icon: Wallet,
      href: "/admin/bookings",
      tone: "bg-primary/15 text-primary-ink",
    },
    {
      label: "Restaurants",
      count: restaurants.length,
      description: "Dining venues and food outlets",
      icon: UtensilsCrossed,
      href: "/admin/restaurants",
      tone: "bg-coral/15 text-[color-mix(in_oklab,var(--coral),var(--deep)_40%)]",
    },
  ];

  const shortcuts = SHORTCUTS.filter((item) => canAccess(role, item.href));
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date());

  return (
    <section className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl bg-deep px-6 py-8 text-white shadow-[var(--shadow-card)] sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-primary/35 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-40 size-64 rounded-full bg-secondary/25 blur-3xl"
          aria-hidden="true"
        />
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-white/[0.06]"
          viewBox="0 0 1200 64"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M0 32c100-24 200-24 300 0s200 24 300 0 200-24 300 0 200 24 300 0v32H0z"
          />
        </svg>
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {today}
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}, welcome back
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">
            A snapshot of what&apos;s live across Park Vega right now.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const linked = canAccess(role, card.href);
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className={`grid size-11 place-items-center rounded-2xl ${card.tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {linked ? (
                  <ArrowUpRight
                    className="size-5 text-muted-foreground/50 transition-colors group-hover:text-primary-ink"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <p className="mt-5 font-display text-4xl font-bold tracking-tight text-deep">
                {card.count.toLocaleString("en-GB")}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </>
          );
          const className =
            "group rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] transition-[translate,border-color] duration-200";
          return linked ? (
            <Link key={card.label} href={card.href} className={`${className} hover:-translate-y-0.5 hover:border-primary/60`}>
              {body}
            </Link>
          ) : (
            <div key={card.label} className={className}>
              {body}
            </div>
          );
        })}
      </div>

      {shortcuts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-deep">Jump back in</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/60 hover:bg-ice/50"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ice text-primary-ink transition-colors group-hover:bg-primary group-hover:text-deep">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
