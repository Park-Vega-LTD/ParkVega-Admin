import type { Metadata } from "next";

import { serverFetch } from "@/lib/api.server";
import type { ContentPage } from "@/types/api";

import { ContentAdmin, type MediaFile } from "./content-admin";

export function generateMetadata(): Metadata {
  return {
    title: "Content · Admin · Park Vega",
    description:
      "Manage Park Vega CMS pages and media library: create pages, upload media, and remove files.",
  };
}

// Admin data must always reflect the latest server state.
export const dynamic = "force-dynamic";

/**
 * Admin content page (`/admin/content`, Requirement 11.6).
 *
 * SSR Server Component: fetches the CMS page list via `serverFetch`
 * (`GET /content/pages`) and the existing media files
 * (`GET /content/media`), then hands both to the `"use client"`
 * {@link ContentAdmin} wrapper. The wrapper lets an admin create a CMS page
 * (`POST /content/pages`), upload a media file via multipart form through the
 * BFF data proxy (`POST /content/media`), and delete existing media files
 * (`DELETE` via the BFF proxy). All browser-side calls go through the BFF
 * data proxy, never the REST API directly (Requirement 14.2).
 */
export default async function AdminContentPage() {
  const [pages, media] = await Promise.all([
    serverFetch<ContentPage[]>("/content/pages").catch(() => [] as ContentPage[]),
    serverFetch<MediaFile[]>("/content/media").catch(() => [] as MediaFile[]),
  ]);

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          Create CMS pages, upload media files, and manage the media library.
        </p>
      </header>
      <ContentAdmin initialPages={pages} initialMedia={media} />
    </section>
  );
}
