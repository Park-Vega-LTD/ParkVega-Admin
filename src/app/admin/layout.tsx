import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/parkvega/admin-nav";
import { getSessionRole, isStaffRole } from "@/lib/session";

/**
 * Admin console layout — Server Component role guard.
 *
 * Verifies the `pv_admin_access` JWT and reads its `role` claim. Anyone who is not
 * `admin` or `staff` is sent to the login page. Staff manage the CMS;
 * admin-only sections are guarded in proxy.ts and hidden from staff in the nav.
 *
 * The proxy already enforces this guard; verifying again here is
 * defence-in-depth.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await getSessionRole();
  if (!isStaffRole(role)) redirect("/login?next=/admin");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row">
        <AdminNav isAdmin={role === "admin"} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
