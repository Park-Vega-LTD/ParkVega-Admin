import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";
import { canAccess, getSession } from "@/lib/session";

import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff | Park Vega Admin" };

export default async function AdminStaffPage() {
  const session = await getSession();
  // Staff accounts are superadmin-only (the API's /staff routes require it);
  // the proxy enforces this too.
  if (!session || !canAccess(session.role, "/admin/staff")) redirect("/admin");

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Staff"
        description="Who can use this console. Staff run content and park operations, POS handles bookings and food, CMS edits the website, admins also see money, and superadmins manage this page."
      />
      <StaffManager currentUserId={session.userId} />
    </section>
  );
}
