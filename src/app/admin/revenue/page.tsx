import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { getSessionRole } from "@/lib/session";

import { RevenueReportView } from "./revenue-report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Revenue | Park Vega Admin" };

export default async function AdminRevenuePage() {
  // Money is admin-only; the proxy enforces this too.
  if ((await getSessionRole()) !== "admin") redirect("/admin");

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
