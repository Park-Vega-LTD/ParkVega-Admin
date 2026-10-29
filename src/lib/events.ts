import type { Event, EventCategory } from "@/types/api";

/** Marketing categories for the event calendar (brief §7). */
export const EVENT_CATEGORIES: Record<EventCategory, { label: string; className: string }> = {
  SEASONAL: { label: "Seasonal event", className: "bg-primary text-primary-foreground" },
  HOLIDAY_OPENING: { label: "Holiday opening", className: "bg-secondary text-secondary-foreground" },
  PROMO: { label: "Special promo", className: "bg-accent text-accent-foreground" },
  PARTY: { label: "Party & celebration", className: "bg-deep text-hero-foreground" },
};

export function categoryOf(event: Pick<Event, "category">) {
  return EVENT_CATEGORIES[event.category ?? "SEASONAL"] ?? EVENT_CATEGORIES.SEASONAL;
}
