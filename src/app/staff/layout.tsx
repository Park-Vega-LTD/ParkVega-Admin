import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/parkvega/sign-out-button";
import { getSessionRole, isStaffRole } from "@/lib/session";

/**
 * Staff tools layout — Server Component.
 *
 * Minimal shell with no admin sidebar, for gate devices. The proxy enforces
 * the `staff`/`admin` role; this re-check is defence-in-depth.
 */
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isStaffRole(await getSessionRole())) redirect("/login?next=/staff/gate");

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
