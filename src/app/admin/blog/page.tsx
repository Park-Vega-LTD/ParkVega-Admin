import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, PenLine, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { serverFetch } from "@/lib/api.server";
import { isBlogPost, isPublished, postDate } from "@/lib/blog";
import { publicSiteUrl } from "@/lib/public-site";
import type { ContentPage } from "@/types/api";

export const metadata: Metadata = { title: "Blog | Park Vega Admin" };

// Admin data must always reflect the latest server state.
export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const pages = await serverFetch<ContentPage[]>("/content/pages", { cache: "no-store" }).catch(
    () => [] as ContentPage[],
  );
  const posts = pages.filter(isBlogPost).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Write visit guides, event recaps and park news. Drafts stay private until you publish.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="size-4" /> New post
          </Link>
        </Button>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No posts yet. Ideas that rank well: &ldquo;What to wear to Park Vega&rdquo;, &ldquo;Day trip from Asaba&rdquo;,
          &ldquo;Planning a birthday at a water park&rdquo;.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={isPublished(post) ? "default" : "secondary"}>
                    {isPublished(post) ? "Published" : "Draft"}
                  </Badge>
                  <span className="truncate font-semibold">{post.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  /blog/{post.slug} · {isPublished(post) ? "published" : "updated"}{" "}
                  {new Date(isPublished(post) ? postDate(post) : post.updated_at).toLocaleDateString("en-NG", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {isPublished(post) && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={publicSiteUrl(`/blog/${post.slug}`)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" /> View
                    </a>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/blog/${post.slug}`}>
                    <PenLine className="size-4" /> Edit
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
