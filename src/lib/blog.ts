import type { ContentPage } from "@/types/api";

/**
 * CMS slugs that back dedicated pages rather than blog posts. `GET
 * /content/pages` returns every CMS page; the blog shows only the rest.
 */
export const NON_BLOG_SLUGS = new Set(["plan-your-visit", "services"]);

export function isBlogPost(page: ContentPage) {
  return !NON_BLOG_SLUGS.has(page.slug);
}

/** Posts without a status predate drafts and count as published. */
export function isPublished(page: ContentPage) {
  return page.status !== "DRAFT";
}

/** Body text without formatting marks, for excerpts and meta descriptions. */
export function toPlainText(body: string): string {
  return body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`~]/g, " ")
    .replace(/^\s*[-\d.]+\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function excerptOf(page: ContentPage, max = 160) {
  return truncate(page.excerpt?.trim() || toPlainText(page.body), max);
}

export function readMinutes(body: string) {
  return Math.max(1, Math.round(toPlainText(body).split(" ").length / 200));
}

/** "Best water parks in Delta!" → "best-water-parks-in-delta" */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Publish date for display and schema: published_at, else last update. */
export function postDate(page: ContentPage) {
  return page.published_at ?? page.updated_at;
}
