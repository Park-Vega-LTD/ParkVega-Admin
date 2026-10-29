"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { clientFetch } from "@/lib/api.client";
import type { ContentPage } from "@/types/api";
import {
  MediaUploader,
  FILE_TOO_LARGE_MESSAGE,
} from "@/components/parkvega/media-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * A media library entry returned by `GET /content/media`.
 *
 * The REST API does not model media in the shared entity set, so the admin
 * media library uses this local shape. Only `id` is required; the remaining
 * fields are rendered when present.
 */
export interface MediaFile {
  id: string;
  filename?: string | null;
  url?: string | null;
  size?: number | null;
  content_type?: string | null;
  created_at?: string | null;
}

/** 50 MB in bytes — the hard upload ceiling (Requirement 11.10). */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const CONTENT_PAGES_KEY: QueryKey = ["content-pages"];
const CONTENT_MEDIA_KEY: QueryKey = ["content-media"];

// ---------------------------------------------------------------------------
// Create CMS page — POST /api/content/pages
// ---------------------------------------------------------------------------

const createPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(150, "Title is too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(150, "Slug is too long")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and hyphens only",
    ),
  body: z.string().min(1, "Body is required"),
});
type CreatePageValues = z.infer<typeof createPageSchema>;

function CreatePageDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreatePageValues>({
    resolver: zodResolver(createPageSchema),
    defaultValues: { title: "", slug: "", body: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreatePageValues) =>
      clientFetch<ContentPage>("/api/content/pages", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_PAGES_KEY });
      toast.success("CMS page created.");
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Create page</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create CMS page</DialogTitle>
          <DialogDescription>
            Add a new content page. The slug becomes part of the public URL.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Plan Your Visit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="plan-your-visit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={8}
                      placeholder="Page content (Markdown or HTML)…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Media upload — multipart POST through the BFF data proxy
// ---------------------------------------------------------------------------

/**
 * Uploads a media file via multipart form through the BFF data proxy.
 *
 * `clientFetch` defaults to an `application/json` content-type, which would
 * break multipart boundary negotiation, so we issue a direct `fetch` to the
 * BFF route (`/api/content/media`) with `credentials: 'same-origin'` and NO
 * explicit `Content-Type` header — the browser sets the correct
 * `multipart/form-data; boundary=…` header for the `FormData` body. The call
 * still targets the BFF proxy, never the REST API directly (Requirement 14.2).
 */
async function uploadMedia(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/content/media", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
    // Intentionally NO Content-Type header — the browser adds the multipart
    // boundary automatically.
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message ?? `Upload failed (${res.status})`);
  }
}

function MediaLibrary({ initialMedia }: { initialMedia: MediaFile[] }) {
  const queryClient = useQueryClient();

  const { data: media = initialMedia } = useQuery({
    queryKey: CONTENT_MEDIA_KEY,
    queryFn: () => clientFetch<MediaFile[]>("/api/content/media"),
    initialData: initialMedia,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_MEDIA_KEY });
      toast.success("Media uploaded.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <MediaUploader
        maxSize={MAX_UPLOAD_BYTES}
        isUploading={uploadMutation.isPending}
        onUpload={(file) => uploadMutation.mutate(file)}
      />

      {media.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          No media files yet. Upload one to get started.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {media.map((item) => (
            <MediaRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaRow({ item }: { item: MediaFile }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () =>
      clientFetch(`/api/content/media/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_MEDIA_KEY });
      toast.success("Media deleted.");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const label = item.filename ?? item.url ?? item.id;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{label}</span>
        {item.content_type ? (
          <span className="text-xs text-muted-foreground">
            {item.content_type}
          </span>
        ) : null}
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${label}`}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this media file?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {label} from the media library. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

// ---------------------------------------------------------------------------
// CMS pages list
// ---------------------------------------------------------------------------

function PagesList({ initialPages }: { initialPages: ContentPage[] }) {
  const { data: pages = initialPages } = useQuery({
    queryKey: CONTENT_PAGES_KEY,
    queryFn: () => clientFetch<ContentPage[]>("/api/content/pages"),
    initialData: initialPages,
  });

  if (pages.length === 0) {
    return (
      <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
        No CMS pages yet. Create one to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {pages.map((page) => (
        <li
          key={page.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{page.title}</span>
            <span className="truncate text-xs text-muted-foreground">
              /{page.slug}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

/**
 * Client wrapper for `/admin/content` (Requirement 11.6).
 *
 * Seeds TanStack Query with the SSR-fetched CMS pages and media files, then
 * exposes:
 *  - a "Create page" dialog (`POST /api/content/pages`),
 *  - a {@link MediaUploader} with a 50 MB client-side guard (Requirement
 *    11.10) that uploads via multipart form through the BFF data proxy
 *    (`POST /api/content/media`),
 *  - per-file delete actions (`DELETE /api/content/media/:id`).
 *
 * Every browser-side call targets the BFF data proxy, never the REST API
 * directly (Requirement 14.2).
 *
 * Validates: Requirements 11.6, 11.10
 */
export function ContentAdmin({
  initialPages,
  initialMedia,
}: {
  initialPages: ContentPage[];
  initialMedia: MediaFile[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>CMS pages</CardTitle>
            <CardDescription>
              Content pages served across the public site.
            </CardDescription>
          </div>
          <CreatePageDialog />
        </CardHeader>
        <CardContent>
          <PagesList initialPages={initialPages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media library</CardTitle>
          <CardDescription>
            Upload media files up to {Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}{" "}
            MB. Larger files are rejected before upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MediaLibrary initialMedia={initialMedia} />
        </CardContent>
      </Card>
    </div>
  );
}

// Re-exported so tests and callers can assert the exact guard copy.
export { FILE_TOO_LARGE_MESSAGE };
