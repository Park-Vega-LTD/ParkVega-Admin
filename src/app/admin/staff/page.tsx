import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { getSession } from "@/lib/session";

import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff | Park Vega Admin" };

export default async function AdminStaffPage() {
  const session = await getSession();
  // Access control is admin-only; the proxy enforces this too.
  if (session?.role !== "admin") redirect("/admin");

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Staff"
        description="Who can use this console. Staff manage content; admins also see bookings, money and this page."
      />
      <StaffManager currentUserId={session.userId} />
    </section>
  );
}
