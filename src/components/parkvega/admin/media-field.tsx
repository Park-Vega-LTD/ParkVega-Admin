"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { clientFetch } from "@/lib/api.client";

/** A media library entry returned by `GET /content/media`. */
type MediaFile = {
  id: string;
  filename?: string | null;
  url?: string | null;
  content_type?: string | null;
};

const MEDIA_KEY = ["content-media"];

/** Images over 2 MB slow the site down; videos are capped by the brief at 3 MB. */
const LIMITS = { image: 2 * 1024 * 1024, video: 3 * 1024 * 1024 };

async function uploadMedia(file: File): Promise<MediaFile> {
  const formData = new FormData();
  formData.append("file", file);
  // No Content-Type header: the browser adds the multipart boundary.
  const res = await fetch("/api/content/media", { method: "POST", body: formData, credentials: "same-origin" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? `Upload failed (${res.status})`);
  return (body?.data ?? body) as MediaFile;
}

/**
 * Image / video field for admin forms: paste a URL, upload a new file to the
 * media library, or pick an existing one. The value is the file's public URL.
 */
export function MediaField({
  id,
  value,
  onChange,
  kind = "image",
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  kind?: "image" | "video";
}) {
  const queryClient = useQueryClient();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [libraryOpen, setLibraryOpen] = React.useState(false);

  const library = useQuery({
    queryKey: MEDIA_KEY,
    queryFn: () => clientFetch<MediaFile[]>("/api/content/media"),
    enabled: libraryOpen,
  });
  const choices = (library.data ?? []).filter(
    (file) => file.url && (file.content_type ?? "").startsWith(kind === "video" ? "video/" : "image/"),
  );

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > LIMITS[kind]) {
      toast.error(
        kind === "video"
          ? "Videos must be under 3 MB – compress it first so the homepage stays fast."
          : "Images must be under 2 MB – export as WebP or a smaller JPG.",
      );
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      if (!uploaded.url) throw new Error("Upload finished but no URL came back.");
      onChange(uploaded.url);
      queryClient.invalidateQueries({ queryKey: MEDIA_KEY });
      toast.success("Uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      {value ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-xl border bg-muted">
          {kind === "video" ? (
            <video src={value} muted playsInline controls className="aspect-video w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
            <img src={value} alt="" className="aspect-video w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove"
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/90 shadow"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={kind === "video" ? "https://…/hero.mp4" : "https://…/photo.webp"}
      />
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={kind === "video" ? "video/mp4,video/webm" : "image/webp,image/jpeg,image/png,image/avif"}
          className="hidden"
          onChange={handleFile}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload {kind}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen(true)}>
          <ImageIcon className="size-4" /> Choose from library
        </Button>
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>Pick a {kind} you&apos;ve already uploaded.</DialogDescription>
          </DialogHeader>
          {library.isPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : choices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {kind}s in the library yet. Upload one instead.</p>
          ) : (
            <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {choices.map((file) => (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(file.url as string);
                      setLibraryOpen(false);
                    }}
                    className="block w-full overflow-hidden rounded-xl border text-left hover:ring-2 hover:ring-primary"
                  >
                    {kind === "video" ? (
                      <video src={file.url as string} muted className="aspect-video w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an uploaded file
                      <img src={file.url as string} alt={file.filename ?? ""} className="aspect-video w-full object-cover" />
                    )}
                    <span className="block truncate px-2 py-1 text-xs">{file.filename ?? file.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
