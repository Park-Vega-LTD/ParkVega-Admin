import type { Metadata } from "next";

import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = {
  title: "Set up your account | Park Vega Admin",
  description: "Choose a password for your Park Vega staff account.",
};

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <AcceptInviteForm />
      </div>
    </main>
  );
}
