import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApiError, serverFetch } from "@/lib/api.server";
import type { ContentPage } from "@/types/api";

import { BlogEditor } from "./blog-editor";

export const metadata: Metadata = { title: "Edit post | Park Vega Admin" };

// Always edit the latest saved version.
export const dynamic = "force-dynamic";

/** `/admin/blog/new` creates a post; `/admin/blog/<slug>` edits one. */
export default async function AdminBlogEditPage({ params }: PageProps<"/admin/blog/[id]">) {
  const { id } = await params;
  if (id === "new") return <BlogEditor post={null} />;

  let post: ContentPage;
  try {
    post = await serverFetch<ContentPage>(`/content/pages/${encodeURIComponent(id)}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  return <BlogEditor post={post} />;
}
