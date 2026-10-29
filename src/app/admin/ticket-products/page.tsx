import type { Metadata } from "next";

import { serverFetch } from "@/lib/api.server";
import type { TicketProduct } from "@/types/api";

import { TicketProductsManager } from "./ticket-products-manager";

export const metadata: Metadata = {
  title: "Ticket Products | Park Vega Admin",
  description: "Create ticket products and manage their pricing tiers.",
};

/**
 * Admin ticket products page (`/admin/ticket-products`).
 *
 * SSR Server Component: fetches all ticket products via `serverFetch`
 * (`GET /ticket-products`) and hands them to the `"use client"`
 * {@link TicketProductsManager} which renders the list plus create/add
 * controls and runs all mutations through the BFF data proxy.
 *
 * Validates: Requirement 11.4
 */
export default async function AdminTicketProductsPage() {
  const products = await serverFetch<TicketProduct[]>("/ticket-products");

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ticket Products</h1>
        <p className="text-sm text-muted-foreground">
          Create ticket products and add pricing tiers for each visitor category.
        </p>
      </header>
      <TicketProductsManager initialProducts={products} />
    </section>
  );
}
