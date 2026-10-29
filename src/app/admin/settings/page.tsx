import type { Metadata } from "next";

import { serverFetch } from "@/lib/api.server";
import { getTicketProducts, lowestAdultPrice, mergeSettings } from "@/lib/public-data";
import { FALLBACK_TICKET_PRICE } from "@/lib/site";
import type { SiteSettings } from "@/types/api";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Homepage & visit settings | Park Vega Admin" };

// Admin data must always reflect the latest saved settings.
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [saved, products] = await Promise.all([
    serverFetch<Partial<SiteSettings>>("/content/settings", { cache: "no-store" }).catch(
      () => ({}) as Partial<SiteSettings>,
    ),
    getTicketProducts(),
  ]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Homepage &amp; visit settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What visitors see first: price, opening days, hero video and image, and site-wide notices. Changes go live as soon
          as you save.
        </p>
      </header>
      <SettingsForm
        initial={mergeSettings(saved)}
        lowestTicketPrice={lowestAdultPrice(products) ?? FALLBACK_TICKET_PRICE}
      />
    </section>
  );
}
