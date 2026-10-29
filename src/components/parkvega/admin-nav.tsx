"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChefHat,
  ExternalLink,
  FileText,
  Home,
  Images,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  ScanLine,
  Ticket,
  TreePalm,
  TrendingUp,
  Undo2,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/parkvega/logo";
import { SignOutButton } from "@/components/parkvega/sign-out-button";
import { PUBLIC_SITE_URL } from "@/lib/public-site";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Homepage & visit", href: "/admin/settings", icon: Home },
  { label: "Blog", href: "/admin/blog", icon: Newspaper },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Attractions", href: "/admin/attractions", icon: TreePalm },
  { label: "Ticket Products", href: "/admin/ticket-products", icon: Ticket },
  { label: "Restaurants", href: "/admin/restaurants", icon: UtensilsCrossed },
  { label: "Pages & media", href: "/admin/content", icon: FileText },
  { label: "Page images", href: "/admin/page-images", icon: Images },
  { label: "Food orders", href: "/admin/food-orders", icon: ChefHat },
  { label: "Enquiries", href: "/admin/enquiries", icon: MessageSquare },
  { label: "Gate scanner", href: "/staff/gate", icon: ScanLine },
  { label: "Bookings", href: "/admin/bookings", icon: Wallet, adminOnly: true },
  { label: "Revenue", href: "/admin/revenue", icon: TrendingUp, adminOnly: true },
  { label: "Refunds", href: "/admin/refunds", icon: Undo2, adminOnly: true },
  { label: "Staff", href: "/admin/staff", icon: Users, adminOnly: true },
] as const;

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  // `/admin` (overview) should only be active on an exact match so it does not
  // stay highlighted on every sub-page; sub-pages match on prefix.
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="lg:w-64 lg:shrink-0">
      <Link
        href="/admin"
        className="mb-6 hidden items-center gap-2 lg:flex"
        aria-label="Park Vega admin overview"
      >
        <Logo size="sm" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Admin
        </span>
      </Link>

      <nav
        aria-label="Admin navigation"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 lg:flex-col lg:overflow-visible"
      >
        {NAV_ITEMS.filter((item) => isAdmin || !("adminOnly" in item)).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center justify-between gap-2 lg:flex-col lg:items-stretch">
        {PUBLIC_SITE_URL ? (
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 text-sm font-semibold text-foreground/70 hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View public site
          </a>
        ) : null}
        <SignOutButton className="lg:justify-start" />
      </div>
    </aside>
  );
}
