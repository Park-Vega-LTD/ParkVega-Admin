import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";

import { EnquiriesList } from "./enquiries-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Enquiries | Park Vega Admin" };

export default function AdminEnquiriesPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        description="Birthday party and school excursion requests from the website, newest first. Reply on WhatsApp."
      />
      <EnquiriesList />
    </section>
  );
}
