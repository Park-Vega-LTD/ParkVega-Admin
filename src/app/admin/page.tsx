import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, TreePalm, UtensilsCrossed, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { serverFetch } from "@/lib/api.server";
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
}

export default async function AdminOverviewPage() {
  // Fetch every summary collection in parallel. Each fetch degrades to an empty
  // list on failure so a single unreachable endpoint never crashes the whole
  // overview — the affected card simply shows 0.
  const [attractions, events, bookings, restaurants] = await Promise.all([
    serverFetch<Attraction[]>("/attractions", fetchOpts).catch(
      () => [] as Attraction[],
    ),
    serverFetch<Event[]>("/events", fetchOpts).catch(() => [] as Event[]),
    serverFetch<Booking[]>("/bookings", fetchOpts).catch(
      () => [] as Booking[],
    ),
    serverFetch<Restaurant[]>("/restaurants", fetchOpts).catch(
      () => [] as Restaurant[],
    ),
  ]);

  // `serverFetch` unwraps the `{ data, meta }` Envelope and returns `data`
  // (the collection array), so counts are derived from the array length.
  const cards: CountCard[] = [
    {
      label: "Attractions",
      count: attractions.length,
      description: "Rides, pools and zones in the park",
      icon: TreePalm,
    },
    {
      label: "Events",
      count: events.length,
      description: "Scheduled events and special days",
      icon: CalendarDays,
    },
    {
      label: "Bookings",
      count: bookings.length,
      description: "Ticket bookings placed by visitors",
      icon: Wallet,
    },
    {
      label: "Restaurants",
      count: restaurants.length,
      description: "Dining venues and food outlets",
      icon: UtensilsCrossed,
    },
  ];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A snapshot of what&apos;s live across Park Vega right now.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {card.label}
                </CardTitle>
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary-ink">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-display text-4xl font-bold tracking-tight">
                  {card.count}
                </p>
                <CardDescription>{card.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
