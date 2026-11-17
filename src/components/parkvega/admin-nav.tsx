"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChefHat,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Home,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
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
  X,
} from "lucide-react";

import { Logo } from "@/components/parkvega/logo";
import { SignOutButton } from "@/components/parkvega/sign-out-button";
import { PUBLIC_SITE_URL } from "@/lib/public-site";
import { canAccess } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { title: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Website",
    items: [
      { label: "Homepage & visit", href: "/admin/settings", icon: Home },
      { label: "Homepage sections", href: "/admin/sections", icon: LayoutTemplate },
      { label: "Pages & media", href: "/admin/content", icon: FileText },
      { label: "Page images", href: "/admin/page-images", icon: Images },
      { label: "Blog", href: "/admin/blog", icon: Newspaper },
      { label: "Events", href: "/admin/events", icon: CalendarDays },
      { label: "Attractions", href: "/admin/attractions", icon: TreePalm },
      { label: "FAQs", href: "/admin/faqs", icon: HelpCircle },
    ],
  },
  {
    title: "Park operations",
    items: [
      { label: "Ticket Products", href: "/admin/ticket-products", icon: Ticket },
      { label: "Restaurants", href: "/admin/restaurants", icon: UtensilsCrossed },
      { label: "Food orders", href: "/admin/food-orders", icon: ChefHat },
      { label: "Enquiries", href: "/admin/enquiries", icon: MessageSquare },
      { label: "Gate scanner", href: "/staff/gate", icon: ScanLine },
    ],
  },
  {
    title: "Finance & team",
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: Wallet },
      { label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
      { label: "Refunds", href: "/admin/refunds", icon: Undo2 },
      { label: "Staff", href: "/admin/staff", icon: Users },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  staff: "Staff",
  pos: "Point of sale",
  cms: "Content editor",
};

/** `/admin` (overview) is active only on an exact match; sub-pages match on prefix. */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav item for the current page, for the top bar's breadcrumb. */
function useCurrentItem() {
  const isActive = useIsActive();
  for (const group of NAV_GROUPS) {
    const item = group.items.find((entry) => isActive(entry.href));
    if (item) return { group: group.title, label: item.label, href: item.href };
  }
  return null;
}

/** Grouped links, filtered to the sections `role` may open. */
function NavLinks({ role, onNavigate }: { role: string | null; onNavigate?: () => void }) {
  const isActive = useIsActive();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.href)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Admin navigation" className="grid gap-6">
      {groups.map((group) => (
        <div key={group.title ?? "main"} className="grid gap-0.5">
          {group.title ? (
            <p className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/40">
              {group.title}
            </p>
          ) : null}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-deep shadow-[0_10px_24px_-12px_var(--primary)]"
                    : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "size-[1.05rem] shrink-0 transition-colors",
                    active ? "text-deep" : "text-white/45 group-hover:text-primary",
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Role chip and sign-out, pinned to the bottom of the sidebar. */
function SidebarFooter({ role }: { role: string | null }) {
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "Signed in";
  return (
    <div className="grid gap-2 border-t border-white/10 pt-4">
      <div className="flex items-center gap-3 px-2">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary font-display text-sm font-bold text-deep"
          aria-hidden="true"
        >
          {roleLabel.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{roleLabel}</p>
          <p className="text-xs text-white/50">Park Vega console</p>
        </div>
      </div>
      <SignOutButton className="w-full justify-start text-white/70 hover:bg-white/[0.07] hover:text-white" />
    </div>
  );
}

function SidebarBody({ role, onNavigate }: { role: string | null; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm"
        aria-label="Park Vega admin overview"
      >
        <Logo size="sm" />
        <span className="rounded-md bg-deep px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-primary">
          Admin
        </span>
      </Link>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-color:rgb(255_255_255/0.15)_transparent] [scrollbar-width:thin]">
        <NavLinks role={role} onNavigate={onNavigate} />
      </div>
      <SidebarFooter role={role} />
    </div>
  );
}

/** Fixed, full-height sidebar on large screens. */
export function AdminSidebar({ role }: { role: string | null }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 bg-deep lg:block">
      <SidebarBody role={role} />
    </aside>
  );
}

/** Sticky top bar: breadcrumb, public-site link, and the menu drawer on small screens. */
export function AdminTopBar({ role }: { role: string | null }) {
  const [open, setOpen] = React.useState(false);
  const current = useCurrentItem();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-10">
        <SheetPrimitive.Root open={open} onOpenChange={setOpen}>
          <SheetPrimitive.Trigger
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </SheetPrimitive.Trigger>
          <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-deep/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <SheetPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] bg-deep shadow-2xl data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
              <SheetPrimitive.Title className="sr-only">Admin menu</SheetPrimitive.Title>
              <SheetPrimitive.Description className="sr-only">Sections of the Park Vega console</SheetPrimitive.Description>
              <SidebarBody role={role} onNavigate={() => setOpen(false)} />
              <SheetPrimitive.Close
                className="absolute -right-12 top-4 grid size-10 place-items-center rounded-xl bg-white text-deep shadow-lg"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </SheetPrimitive.Close>
            </SheetPrimitive.Content>
          </SheetPrimitive.Portal>
        </SheetPrimitive.Root>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link href="/admin" className="shrink-0 font-semibold text-muted-foreground hover:text-foreground">
            Console
          </Link>
          {current?.group ? (
            <>
              <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground/50 sm:block" aria-hidden="true" />
              <span className="hidden shrink-0 text-muted-foreground sm:inline">{current.group}</span>
            </>
          ) : null}
          {current && current.href !== "/admin" ? (
            <>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              <Link href={current.href} className="truncate font-semibold text-foreground">
                {current.label}
              </Link>
            </>
          ) : null}
        </nav>

        {PUBLIC_SITE_URL ? (
          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground hover:border-primary hover:text-primary-ink"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">View site</span>
          </a>
        ) : null}
      </div>
    </header>
  );
}
