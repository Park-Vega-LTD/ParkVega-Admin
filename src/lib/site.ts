/**
 * Single source of truth for Park Vega's public contact and visit details.
 *
 * Everything customer-facing (header, footer, homepage billboard, WhatsApp
 * button, schema markup) reads from here so a change is made once. These are
 * the fallbacks until the staff CMS exposes editable site settings.
 */

export const SITE_URL = "https://parkvega.com";

export const PHONE_DISPLAY = "+234 802 444 0445";
export const PHONE_E164 = "+2348024440445";
export const EMAIL = "info@parkvega.com";

export const ADDRESS =
  "ParkVega Street, Ewuru Road, off Km 68 Benin–Asaba Expressway, Agbor, Delta State";
export const TOWN = "Agbor, Delta State";

export const OPEN_DAYS_SHORT = "Thu – Sun & public holidays";
export const OPEN_DAYS_LONG =
  "Thursdays, Fridays, Saturdays, Sundays and Public Holidays";
export const OPEN_HOURS = "11am – 6pm";

/** Lowest adult ticket price shown when the ticketing API is unreachable. */
export const FALLBACK_TICKET_PRICE = 15000;

/**
 * Park Vega's social profiles, shown as icons in the footer. A network with
 * no URL yet is left out, so fill these in as the accounts are confirmed.
 */
export const SOCIAL_LINKS: { network: "youtube" | "instagram" | "facebook" | "x"; label: string; url: string | null }[] = [
  { network: "youtube", label: "YouTube", url: null },
  { network: "instagram", label: "Instagram", url: null },
  { network: "facebook", label: "Facebook", url: null },
  { network: "x", label: "X (Twitter)", url: null },
];

/**
 * Industry associations shown in the footer's "Proud members of" strip. Drop
 * the official badge into public/brand/members/ and set `logo` to show it;
 * until then the association's name is shown instead.
 */
export const MEMBERSHIPS: { name: string; url: string; logo: { src: string; width: number; height: number } | null }[] = [
  { name: "World Waterpark Association", url: "https://www.waterparks.org", logo: null },
  { name: "IAAPA", url: "https://www.iaapa.org", logo: null },
];

const MAPS_QUERY ="Park Vega Waterpark, Agbor, Delta State";

export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`;

/** Google Maps driving directions from a given starting point to the park. */
export function directionsUrl(origin: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(MAPS_QUERY)}&travelmode=driving`;
}

/** WhatsApp click-to-chat link to the Park Vega business number. */
export function whatsappUrl(
  message = "Hi Park Vega! I'd like to ask about tickets.",
) {
  return `https://wa.me/${PHONE_E164.slice(1)}?text=${encodeURIComponent(message)}`;
}

export { formatNaira } from "@/lib/utils";

/** Shortens "Thursdays, Fridays…" to "Thu, Fri…" for tight spaces. */
export function shortDays(days: string) {
  return days.replace(/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)days?\b/g, (_, day: string) => day.slice(0, 3));
}

/** Weekdays the park opens (0 = Sunday … 6 = Saturday): Thu, Fri, Sat, Sun. */
export const OPEN_WEEKDAYS = [0, 4, 5, 6];

/**
 * Fallback list of Mon–Wed public holidays when the park also opens. Staff
 * manage the live list in Admin → Homepage & visit settings.
 */
export const EXTRA_OPEN_DATES = [
  "2026-12-28", // Boxing Day observed
  "2027-03-29", // Easter Monday
  "2027-12-27", // Christmas Day observed
  "2027-12-28", // Boxing Day observed
];

/**
 * True when the park is open on the given local `YYYY-MM-DD` date. Pass the
 * staff-managed holiday list from site settings; the built-in list is the
 * fallback.
 */
export function isOpenDate(isoDate: string, extraOpenDates: readonly string[] = EXTRA_OPEN_DATES) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return OPEN_WEEKDAYS.includes(weekday) || extraOpenDates.includes(isoDate);
}

/**
 * Normalise a Nigerian mobile number (080…, 80…, 234…, +234…, with spaces or
 * dashes) to E.164 `+234XXXXXXXXXX`, or return null when it isn't valid.
 */
export function normalizeNgPhone(input: string): string | null {
  const match = input.replace(/[\s()-]/g, "").match(/^(?:\+?234|0)?([789][01]\d{8})$/);
  return match ? `+234${match[1]}` : null;
}
