/**
 * Origin of the public website (parkvega-web), used for "view on site" links.
 * Empty when unset, in which case those links are hidden.
 */
export const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** Absolute URL of a page on the public website. */
export function publicSiteUrl(path: string) {
  return `${PUBLIC_SITE_URL}${path}`;
}
