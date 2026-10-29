import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/parkvega/admin/page-header";

import { KitchenBoard } from "./kitchen-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Food orders | Park Vega Admin" };

export default function AdminFoodOrdersPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Food orders"
        description="Pickup orders placed on the website. The board checks for new orders every 15 seconds and can chime and print a kitchen slip when one arrives."
      />
      <KitchenBoard />
    </section>
  );
}
