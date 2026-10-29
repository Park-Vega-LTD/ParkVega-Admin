import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminBookingsTable } from "@/components/parkvega/admin-bookings-table";
import { serverFetch } from "@/lib/api.server";
import { getSessionRole } from "@/lib/session";
import type { Booking } from "@/types/api";

// Admin data must always reflect the latest server state (bookings change
// constantly as visitors reserve and pay), so render on every request.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    // Title: 26 chars (<= 60)
    title: "Bookings | Park Vega Admin",
    // Description: 108 chars (<= 160)
    description:
      "Review every Park Vega booking—see visit dates, guests, totals, and status, and open full booking detail.",
  };
}

/**
 * Admin bookings page (Requirement 11.7).
 *
 * SSR Server Component: fetches every booking via `serverFetch`
 * (`GET /bookings`) and hands the list to the `"use client"`
 * {@link AdminBookingsTable} wrapper. The wrapper renders the reused
 * `AdminTable` (code, visit date, full name, status, total) and opens a full
 * booking detail modal when an admin selects a row. A failed fetch degrades to
 * an empty list so the table shows its empty-state rather than crashing.
 */
export default async function AdminBookingsPage() {
  // Customer booking data is admin-only; staff manage the CMS sections.
  if ((await getSessionRole()) !== "admin") redirect("/admin");

  const bookings = await serverFetch<Booking[]>("/bookings", {
    cache: "no-store",
  }).catch(() => [] as Booking[]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every booking across the park. Select a booking to view its full
          detail.
        </p>
      </header>

      <AdminBookingsTable bookings={bookings} />
    </section>
  );
}
