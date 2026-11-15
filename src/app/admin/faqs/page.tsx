import type { Metadata } from "next";

import { AdminPageHeader, LoadError } from "@/components/parkvega/admin/page-header";
import { serverFetch } from "@/lib/api.server";
import type { StaffFaq } from "@/lib/faqs";

import { FaqsManager } from "./faqs-manager";

export const metadata: Metadata = { title: "FAQs | Park Vega Admin" };

// Admin data must always reflect the latest saved FAQs.
export const dynamic = "force-dynamic";

export default async function AdminFaqsPage() {
  let faqs: StaffFaq[] = [];
  let error: unknown = null;
  try {
    faqs = await serverFetch<StaffFaq[]>("/content/faqs?include_inactive=true", { cache: "no-store" });
  } catch (caught) {
    error = caught;
  }

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="FAQs"
        description="The questions and answers at the bottom of each website page. Changes go live as soon as you save."
      />
      {error ? <LoadError error={error} /> : <FaqsManager initial={faqs} />}
    </section>
  );
}
