import type { Metadata } from "next";

import type { MenuItem, Restaurant } from "@/types/api";
import { serverFetch } from "@/lib/api.server";

import {
  RestaurantsAdmin,
  type RestaurantWithMenu,
} from "./restaurants-admin";

export const metadata: Metadata = {
  title: "Restaurants · Admin · Park Vega",
  description: "Manage Park Vega restaurants and their menu items.",
};

// Admin data must always reflect the latest server state.
export const dynamic = "force-dynamic";

/**
 * Admin restaurants page (Requirement 11.5).
 *
 * SSR Server Component: fetches every restaurant and, in parallel, each
 * restaurant's menu via `serverFetch` (`GET /restaurants`,
 * `GET /restaurants/:id/menu`). The combined list is handed to the
 * `"use client"` {@link RestaurantsAdmin} wrapper, which renders the reused
 * `AdminTable` and handles all CRUD + menu-item toggle mutations through the
 * BFF data proxy.
 */
export default async function AdminRestaurantsPage() {
  const restaurants = await serverFetch<Restaurant[]>("/restaurants");

  const withMenus: RestaurantWithMenu[] = await Promise.all(
    restaurants.map(async (restaurant) => {
      try {
        const menu = await serverFetch<MenuItem[]>(
          `/restaurants/${restaurant.id}/menu`,
        );
        return { ...restaurant, menu };
      } catch {
        // A single menu failing should not blank the whole admin table.
        return { ...restaurant, menu: [] };
      }
    }),
  );

  return <RestaurantsAdmin restaurants={withMenus} />;
}
