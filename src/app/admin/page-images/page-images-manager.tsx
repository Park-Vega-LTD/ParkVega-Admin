"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/api.client";
import type { MediaFile, PageImage } from "@/lib/admin-types";

/**
 * The spots the public website reads. To add one, list it here and read it on
 * the public page with GET /content/page-images?page_key=<page>.
 */
const SLOTS = [
  {
    page: "home",
    slot: "hero",
    title: "Homepage carousel",
    help: "Replaces the carousel photos in order: photo 1 goes behind the first headline, and so on. Slides without a photo here keep their built-in one.",
    max: 6,
  },
] as const;

type Draft = { media_file_id: string; url: string; alt_text: string };

export function PageImagesManager() {
  return (
    <div className="space-y-8">
      {SLOTS.map((slot) => (
        <SlotEditor key={`${slot.page}/${slot.slot}`} {...slot} />
      ))}
    </div>
  );
}

function SlotEditor({
  page,
  slot,
  title,
  help,
  max,
}: {
  page: string;
  slot: string;
  title: string;
  help: string;
  max: number;
}) {
  const queryClient = useQueryClient();
  const key = ["page-images", page];
  const images = useQuery({
    queryKey: key,
    queryFn: () => clientFetch<PageImage[]>(`/api/content/page-images?page_key=${page}`),
  });

  const [draft, setDraft] = React.useState<Draft[] | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const saved: Draft[] = (images.data ?? [])
    .filter((image) => image.slot === slot)
    .sort((a, b) => a.position - b.position)
    .map((image) => ({ media_file_id: image.media_file_id, url: image.url, alt_text: image.alt_text }));
  const current = draft ?? saved;
  const dirty = draft !== null;
  const missingAlt = current.some((image) => !image.alt_text.trim());

  const save = useMutation({
    mutationFn: () =>
      current.length === 0
        ? clientFetch(`/api/content/page-images/${page}/${slot}`, { method: "DELETE" })
        : clientFetch(`/api/content/page-images/${page}/${slot}`, {
            method: "PUT",
            body: JSON.stringify({
              images: current.map(({ media_file_id, alt_text }) => ({ media_file_id, alt_text: alt_text.trim() })),
            }),
          }),
    onSuccess: () => {
      toast.success(`${title} saved. The website shows it on the next visit.`);
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(error.message),
  });

  function edit(update: (images: Draft[]) => Draft[]) {
    setDraft(update([...current]));
  }

  function move(index: number, by: number) {
    edit((list) => {
      const [item] = list.splice(index, 1);
      list.splice(index + by, 0, item);
      return list;
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{help}</p>
      </header>

      {images.isError ? <LoadError error={images.error} /> : null}

      {images.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : current.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos chosen; the website uses its built-in ones.</p>
      ) : (
        <ol className="space-y-3">
          {current.map((image, index) => (
            <li key={`${image.media_file_id}-${index}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
              <span className="w-6 text-center font-display font-bold text-muted-foreground">{index + 1}</span>
              {/* Media library thumbnails come from any configured host, so a plain img is used. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <div className="min-w-48 flex-1 space-y-1">
                <Label htmlFor={`alt-${slot}-${index}`} className="text-xs">
                  Description for screen readers
                </Label>
                <Input
                  id={`alt-${slot}-${index}`}
                  maxLength={200}
                  value={image.alt_text}
                  placeholder="e.g. Children cheering under the tipping bucket"
                  onChange={(e) =>
                    edit((list) => list.map((item, i) => (i === index ? { ...item, alt_text: e.target.value } : item)))
                  }
                />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={index === current.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() => edit((list) => list.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="gap-2" disabled={current.length >= max} onClick={() => setPickerOpen(true)}>
          <ImagePlus className="size-4" aria-hidden="true" />
          Add photo
        </Button>
        <Button disabled={!dirty || missingAlt || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Discard changes
          </Button>
        ) : null}
        {missingAlt ? <p className="text-sm text-destructive">Every photo needs a description.</p> : null}
        {current.length >= max ? <p className="text-sm text-muted-foreground">Up to {max} photos.</p> : null}
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(file) => {
          edit((list) => [...list, { media_file_id: file.id, url: file.url ?? "", alt_text: "" }]);
          setPickerOpen(false);
        }}
      />
    </section>
  );
}

function MediaPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (file: MediaFile) => void;
}) {
  const library = useQuery({
    queryKey: ["content-media"],
    queryFn: () => clientFetch<MediaFile[]>("/api/content/media"),
    enabled: open,
  });
  const photos = (library.data ?? []).filter((file) => file.url && (file.content_type ?? "").startsWith("image/"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose a photo</DialogTitle>
          <DialogDescription>From the media library. Upload new photos under Pages &amp; media.</DialogDescription>
        </DialogHeader>
        {library.isError ? <LoadError error={library.error} /> : null}
        {library.isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">The media library has no photos yet.</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {photos.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => onPick(file)}
                className="overflow-hidden rounded-xl border border-border text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url ?? ""} alt="" className="aspect-video w-full object-cover" />
                <span className="block truncate px-2 py-1 text-xs text-muted-foreground">{file.filename ?? "Untitled"}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
