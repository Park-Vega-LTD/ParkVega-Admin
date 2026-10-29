"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MediaField } from "@/components/parkvega/admin/media-field";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/api.client";
import { EVENT_CATEGORIES } from "@/lib/events";
import type { Event, EventCategory } from "@/types/api";

type Values = {
  title: string;
  description: string;
  category: EventCategory;
  image_url: string;
  status: "DRAFT" | "PUBLISHED";
};

function toValues(event: Event | null): Values {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    category: event?.category ?? "SEASONAL",
    image_url: event?.image_url ?? "",
    status: event?.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
  };
}

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/**
 * Create (`POST /api/events`) or edit (`PATCH /api/events/:id`) an event:
 * title, category, description, image and draft/published status. Sessions
 * (dates and times) are added separately with "Add session".
 */
export function EventDialog({
  event,
  open,
  onOpenChange,
}: {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [values, setValues] = React.useState(() => toValues(event));
  const [lastEvent, setLastEvent] = React.useState(event);
  // Reset the form whenever a different event is opened.
  if (event !== lastEvent) {
    setLastEvent(event);
    setValues(toValues(event));
  }
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (next: Values) => {
      const body = JSON.stringify({
        title: next.title.trim(),
        description: next.description.trim() || null,
        category: next.category,
        image_url: next.image_url || null,
        status: next.status,
      });
      return event
        ? clientFetch<Event>(`/api/events/${event.id}`, { method: "PATCH", body })
        : clientFetch<Event>("/api/events", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(event ? "Event updated." : "Event created – now add its dates with “Add session”.");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      router.refresh();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    if (values.title.trim().length < 3) {
      toast.error("Add a title.");
      return;
    }
    save.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Create event"}</DialogTitle>
          <DialogDescription>
            Published events appear on the events calendar and in Google&apos;s event results automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Easter Monday Splash Day" maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="event-category">Type</Label>
              <select id="event-category" className={selectClass} value={values.category} onChange={(e) => set("category", e.target.value as EventCategory)}>
                {Object.entries(EVENT_CATEGORIES).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-status">Visibility</Label>
              <select id="event-status" className={selectClass} value={values.status} onChange={(e) => set("status", e.target.value as Values["status"])}>
                <option value="DRAFT">Draft (hidden)</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          </div>
          {values.category === "HOLIDAY_OPENING" && (
            <p className="rounded-lg bg-secondary/30 px-3 py-2 text-xs">
              Once published, this event&apos;s session dates open the park for ticket bookings and food pre-orders –
              even on a Monday to Wednesday.
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea id="event-description" rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} placeholder="What's happening, and why it's worth coming." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-image">Image</Label>
            <MediaField id="event-image" value={values.image_url} onChange={(url) => set("image_url", url)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {event ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
