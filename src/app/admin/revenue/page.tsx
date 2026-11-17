import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { requireAccess } from "@/lib/session";

import { RevenueReportView } from "./revenue-report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Revenue | Park Vega Admin" };

export default async function AdminRevenuePage() {
  // Money is admin-only; the proxy enforces this too.
  await requireAccess("/admin/revenue");

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Revenue"
        description="Ticket revenue from paid bookings, by product, for the dates you pick."
      />
      <RevenueReportView />
    </section>
  );
}
