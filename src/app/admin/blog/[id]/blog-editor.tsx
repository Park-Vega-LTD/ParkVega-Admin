"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Bold, Heading2, ImagePlus, Link2, List, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { MediaField } from "@/components/parkvega/admin/media-field";
import { RichText } from "@/components/parkvega/rich-text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/api.client";
import { NON_BLOG_SLUGS, excerptOf, slugify, truncate } from "@/lib/blog";
import type { ContentPage } from "@/types/api";

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  body: string;
  seo_title: string;
  seo_description: string;
};

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

function toDraft(post: ContentPage | null): Draft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    body: post?.body ?? "",
    seo_title: post?.seo_title ?? "",
    seo_description: post?.seo_description ?? "",
  };
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={value.length > max ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>
      {value.length}/{max}
    </span>
  );
}

/**
 * Blog post editor: title, URL slug, excerpt, cover image, formatted body
 * with live preview, SEO fields with a Google-style preview, and draft /
 * publish. Saves through the BFF proxy to `POST /content/pages` (new) or
 * `PATCH /content/pages/:id`, and deletes with `DELETE /content/pages/:id`.
 */
export function BlogEditor({ post }: { post: ContentPage | null }) {
  const router = useRouter();
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = React.useState(() => toDraft(post));
  const [slugTouched, setSlugTouched] = React.useState(Boolean(post));
  const [imageDialog, setImageDialog] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageAlt, setImageAlt] = React.useState("");
  const published = post?.status !== "DRAFT" && post !== null;

  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (status: "DRAFT" | "PUBLISHED") => {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim() || null,
        cover_image_url: draft.cover_image_url || null,
        seo_title: draft.seo_title.trim() || null,
        seo_description: draft.seo_description.trim() || null,
        status,
        published_at: status === "PUBLISHED" ? (post?.published_at ?? new Date().toISOString()) : (post?.published_at ?? null),
      };
      return post
        ? clientFetch<ContentPage>(`/api/content/pages/${post.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : clientFetch<ContentPage>("/api/content/pages", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: (saved, status) => {
      toast.success(status === "PUBLISHED" ? "Published – now live on the blog." : "Draft saved.");
      const slug = saved?.slug ?? draft.slug;
      if (!post || slug !== post.slug) router.replace(`/admin/blog/${slug}`);
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () => clientFetch(`/api/content/pages/${post?.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Post deleted.");
      router.replace("/admin/blog");
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function validate(): string | null {
    if (draft.title.trim().length < 3) return "Add a title.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) return "The URL can only use lowercase letters, numbers and hyphens.";
    if (NON_BLOG_SLUGS.has(draft.slug)) return "That URL is reserved for a site page – pick another.";
    return null;
  }

  function submit(status: "DRAFT" | "PUBLISHED") {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    if (status === "PUBLISHED" && draft.body.trim().length < 50) {
      toast.error("Write a little more before publishing.");
      return;
    }
    save.mutate(status);
  }

  /** Wraps the selection (or inserts a template) in the body textarea. */
  function format(kind: "h2" | "bold" | "list" | "link") {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);
    const block = (text: string) => `${start > 0 && value[start - 1] !== "\n" ? "\n\n" : ""}${text}\n\n`;
    const insert = {
      h2: block(`## ${selected || "Heading"}`),
      bold: `**${selected || "bold text"}**`,
      list: block((selected || "First point\nSecond point").split("\n").map((line) => `- ${line}`).join("\n")),
      link: `[${selected || "link text"}](https://)`,
    }[kind];
    const next = value.slice(0, start) + insert + value.slice(end);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + insert.length, start + insert.length);
    });
  }

  function insertImage() {
    if (!imageUrl) return;
    const el = bodyRef.current;
    const at = el?.selectionStart ?? draft.body.length;
    const snippet = `\n\n![${imageAlt.replace(/[[\]]/g, "")}](${imageUrl})\n\n`;
    set("body", draft.body.slice(0, at) + snippet + draft.body.slice(at));
    setImageDialog(false);
    setImageUrl("");
    setImageAlt("");
  }

  const previewTitle = truncate(draft.seo_title || `${draft.title || "Post title"} | Park Vega Blog`, SEO_TITLE_MAX);
  const previewDescription = truncate(
    draft.seo_description ||
      excerptOf({ id: "", slug: draft.slug, title: draft.title, body: draft.body, excerpt: draft.excerpt, updated_at: "" }) ||
      "Add an excerpt or meta description.",
    SEO_DESCRIPTION_MAX,
  );
  const busy = save.isPending || remove.isPending;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-ink">
            <ArrowLeft className="size-4" /> All posts
          </Link>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
            {post ? "Edit post" : "New post"}
            {post && <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Draft"}</Badge>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {post && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" disabled={busy}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{post.title}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The post is removed from the blog and can&apos;t be recovered. To hide it instead, switch it to a draft.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Delete post</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => submit("DRAFT")} disabled={busy}>
            {published ? "Unpublish to draft" : "Save draft"}
          </Button>
          <Button onClick={() => submit("PUBLISHED")} disabled={busy}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {published ? "Update" : "Publish"}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="grid gap-5 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={(event) => {
                  set("title", event.target.value);
                  if (!slugTouched) set("slug", slugify(event.target.value));
                }}
                placeholder="e.g. What to wear to Park Vega Waterpark"
                className="h-12 text-lg font-semibold"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">URL</Label>
              <div className="flex items-center rounded-md border border-input">
                <span className="pl-3 text-sm text-muted-foreground">parkvega.com/blog/</span>
                <input
                  id="slug"
                  value={draft.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    set("slug", slugify(event.target.value) || event.target.value.toLowerCase());
                  }}
                  className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
                />
              </div>
              {published && <p className="text-xs text-muted-foreground">Changing the URL of a published post breaks links already shared.</p>}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Counter value={draft.excerpt} max={SEO_DESCRIPTION_MAX} />
              </div>
              <Textarea
                id="excerpt"
                rows={2}
                value={draft.excerpt}
                onChange={(event) => set("excerpt", event.target.value)}
                placeholder="One or two sentences shown on the blog list and in Google results."
              />
            </div>

            <Tabs defaultValue="write">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <div className="flex gap-1" aria-label="Formatting">
                  <Button type="button" variant="ghost" size="icon" onClick={() => format("h2")} aria-label="Heading">
                    <Heading2 className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => format("bold")} aria-label="Bold">
                    <Bold className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => format("list")} aria-label="Bullet list">
                    <List className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => format("link")} aria-label="Link">
                    <Link2 className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setImageDialog(true)} aria-label="Insert image">
                    <ImagePlus className="size-4" />
                  </Button>
                </div>
              </div>
              <TabsContent value="write" className="mt-3">
                <Textarea
                  ref={bodyRef}
                  value={draft.body}
                  onChange={(event) => set("body", event.target.value)}
                  rows={22}
                  className="font-mono text-sm leading-relaxed"
                  placeholder={"Start writing…\n\nLeave a blank line between paragraphs.\n## Use this for a heading\n- and this for a bullet point"}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="min-h-[24rem] rounded-xl border p-6">
                  {draft.body.trim() ? (
                    <RichText body={draft.body} className="space-y-5 leading-relaxed text-muted-foreground" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cover image</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaField id="cover" value={draft.cover_image_url} onChange={(url) => set("cover_image_url", url)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search engines</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-xl border bg-background p-3">
                <p className="truncate text-xs text-muted-foreground">parkvega.com › blog › {draft.slug || "…"}</p>
                <p className="mt-0.5 line-clamp-2 text-base text-[#1a0dab]">{previewTitle}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{previewDescription}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seo-title">SEO title</Label>
                  <Counter value={draft.seo_title} max={SEO_TITLE_MAX} />
                </div>
                <Input id="seo-title" value={draft.seo_title} onChange={(event) => set("seo_title", event.target.value)} placeholder="Defaults to the post title" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="seo-description">Meta description</Label>
                  <Counter value={draft.seo_description} max={SEO_DESCRIPTION_MAX} />
                </div>
                <Textarea
                  id="seo-description"
                  rows={3}
                  value={draft.seo_description}
                  onChange={(event) => set("seo_description", event.target.value)}
                  placeholder="Defaults to the excerpt"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: use the exact words people search, e.g. &ldquo;Park Vega ticket price&rdquo; or &ldquo;water park near Asaba&rdquo;.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={imageDialog} onOpenChange={setImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>The image appears where your cursor is in the post.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <MediaField id="inline-image" value={imageUrl} onChange={setImageUrl} />
            <div className="grid gap-2">
              <Label htmlFor="inline-alt">Description (for Google and screen readers)</Label>
              <Input id="inline-alt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="e.g. Kids on the Aqua Tower slides" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={insertImage} disabled={!imageUrl}>
              Insert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
