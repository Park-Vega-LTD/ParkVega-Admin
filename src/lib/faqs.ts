/** A FAQ as staff see it: GET /content/faqs?include_inactive=true. */
export interface StaffFaq {
  id: string;
  page: FaqPage;
  question: string;
  answer: string;
  is_active: boolean;
  display_position: number;
}

/**
 * Website pages a FAQ can belong to, matching FAQ_PAGES in the API.
 * "Every page" FAQs show on all pages, after that page's own questions.
 */
export const FAQ_PAGES = [
  { value: "all", label: "Every page" },
  { value: "home", label: "Homepage" },
  { value: "attractions", label: "Attractions" },
  { value: "plan-your-visit", label: "Plan your visit" },
  { value: "restaurants", label: "Restaurants" },
  { value: "events", label: "Events" },
  { value: "birthday-parties", label: "Birthday parties" },
  { value: "school-excursions", label: "School excursions" },
  { value: "services", label: "Services" },
  { value: "directions", label: "Directions" },
  { value: "tickets", label: "Tickets" },
] as const;

export type FaqPage = (typeof FAQ_PAGES)[number]["value"];

export function faqPageLabel(page: string): string {
  return FAQ_PAGES.find((option) => option.value === page)?.label ?? page;
}
