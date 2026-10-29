import type { Metadata } from "next";

import { AdminAttractionsTable } from "@/components/parkvega/admin-attractions-table";
import { serverFetch } from "@/lib/api.server";
import type { Attraction } from "@/types/api";

// SSR: admins manage live attraction state (including INACTIVE records that are
// hidden from the public site), so render on every request rather than caching
// (Requirement 11.2).
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    // Title: 38 chars (<= 60)
    title: "Attractions | Park Vega Admin",
    // Description: 101 chars (<= 160)
    description:
      "Manage Park Vega attractions—review every ride and pool and toggle each one active or inactive.",
  };
}

export default async function AdminAttractionsPage() {
  // Fetch ALL attractions, including INACTIVE ones (admins need the full list,
  // unlike the public listing which filters to ACTIVE). A failed fetch degrades
  // to an empty list so the table renders its empty-state rather than crashing.
  const attractions = await serverFetch<Attraction[]>("/attractions", {
    cache: "no-store",
  }).catch(() => [] as Attraction[]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Attractions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every attraction, including inactive ones. Edit the details shown on
          each attraction page, and toggle to publish or hide it.
        </p>
      </header>

      <AdminAttractionsTable attractions={attractions} />
    </section>
  );
}
