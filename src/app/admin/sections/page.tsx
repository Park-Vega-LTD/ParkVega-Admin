import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";

import { SectionsManager } from "./sections-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Homepage sections | Park Vega Admin" };

export default function AdminSectionsPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Homepage sections"
        description="Text, lists and videos for homepage sections. A section you haven't saved shows the website's built-in copy; Reset puts it back."
      />
      <SectionsManager />
    </section>
  );
}
