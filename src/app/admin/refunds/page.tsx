import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { getSessionRole } from "@/lib/session";

import { RefundsManager } from "./refunds-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Refunds | Park Vega Admin" };

export default async function AdminRefundsPage() {
  // Money is admin-only; the proxy enforces this too.
  if ((await getSessionRole()) !== "admin") redirect("/admin");

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Refunds"
        description="Refund requests from visitors. Approving one returns the money through the payment provider and cancels the tickets."
      />
      <RefundsManager />
    </section>
  );
}
