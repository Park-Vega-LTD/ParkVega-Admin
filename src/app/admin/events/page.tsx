import type { Metadata } from "next";

import { AdminEventsManager } from "@/components/parkvega/admin-events-manager";
import { serverFetch } from "@/lib/api.server";
import { getSiteSettings } from "@/lib/public-data";
import type { Event } from "@/types/api";

// SSR: the admin events list must reflect the latest saved data on every
// request (Requirement 11.3), so opt out of caching.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    // Title: 36 chars (<= 60)
    title: "Events | Park Vega Admin Dashboard",
    // Description: 118 chars (<= 160)
    description:
      "Manage Park Vega events—create new events, add sessions, and cancel events and their future sessions from one place.",
  };
}

export default async function AdminEventsPage() {
  // A failed fetch degrades to an empty list so the page still renders and the
  // admin can create a new event.
  const [events, settings] = await Promise.all([
    serverFetch<Event[]>("/events", { cache: "no-store" }).catch(() => [] as Event[]),
    getSiteSettings(),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Events
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The park&apos;s event calendar: seasonal events, holiday openings and
          promos. Published events update the public calendar and Google
          event listings automatically.
        </p>
      </header>

      <AdminEventsManager events={events} extraOpenDates={settings.extra_open_dates} />
    </section>
  );
}
