import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";

import { PageImagesManager } from "./page-images-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Page images | Park Vega Admin" };

export default function AdminPageImagesPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Page images"
        description="Photos for fixed spots on the website, in display order. Upload new photos under Pages & media first."
      />
      <PageImagesManager />
    </section>
  );
}
