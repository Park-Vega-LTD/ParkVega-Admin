import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/parkvega/sign-out-button";
import { canAccess, getSessionRole, isStaffRole } from "@/lib/session";

/**
 * Staff tools layout — Server Component.
 *
 * Minimal shell with no admin sidebar, for gate devices. The proxy enforces
 * the roles allowed on the gate (lib/roles.ts); this re-check is
 * defence-in-depth.
 */
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const role = await getSessionRole();
  if (!isStaffRole(role)) redirect("/login?next=/staff/gate");
  if (!canAccess(role, "/staff/gate")) redirect("/admin");

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex justify-end">
          <SignOutButton />
        </div>
        {children}
      </div>
    </div>
  );
}
