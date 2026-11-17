import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { requireAccess } from "@/lib/session";

import { RefundsManager } from "./refunds-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Refunds | Park Vega Admin" };

export default async function AdminRefundsPage() {
  // Money is admin-only; the proxy enforces this too.
  await requireAccess("/admin/refunds");

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
