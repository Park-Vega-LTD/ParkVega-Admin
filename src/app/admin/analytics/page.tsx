import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { requireAccess } from "@/lib/session";

import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics | Park Vega Admin" };

export default async function AdminAnalyticsPage() {
  // Money is admin-only; the proxy and the API enforce this too.
  await requireAccess("/admin/analytics");

  return (
    <section className="space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Analytics"
        description="Revenue, bookings, the booking funnel and visitor demand, from Park Vega's own payment and ticket records."
      />
      <AnalyticsDashboard />
    </section>
  );
}
