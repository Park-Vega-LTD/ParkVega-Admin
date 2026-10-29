"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clientFetch } from "@/lib/api.client";
import { cn } from "@/lib/utils";

/** Ends the staff session and returns to the login page. */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await clientFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    // Full navigation so no cached server component keeps the old session.
    window.location.assign("/login");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOut}
      disabled={pending}
      className={cn("gap-2", className)}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
