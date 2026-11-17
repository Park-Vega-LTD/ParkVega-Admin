import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminSidebar, AdminTopBar } from "@/components/parkvega/admin-nav";
import { getSessionRole, isStaffRole } from "@/lib/session";

/**
 * Admin console layout — Server Component role guard.
 *
 * Verifies the `pv_admin_access` JWT and reads its `role` claim. Anyone who is not
 * a console role is sent to the login page. Each section is limited to the
 * roles in SECTION_ROLES (lib/roles.ts): proxy.ts enforces it and the nav
 * hides what a role cannot open.
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
    <div className="flex min-h-screen bg-[linear-gradient(180deg,var(--ocean-soft),var(--muted)_28rem)]">
      <AdminSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar role={role} />
        <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
