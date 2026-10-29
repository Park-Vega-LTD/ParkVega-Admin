"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { MediaField } from "@/components/parkvega/admin/media-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientFetch } from "@/lib/api.client";
import { formatNaira } from "@/lib/utils";
import type { SiteSettings } from "@/types/api";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Staff form for `PUT /api/content/settings`: the homepage billboard (price,
 * opening days and hours, hero video and image), the holiday open dates that
 * the booking calendar allows, and an optional site-wide notice.
 */
export function SettingsForm({ initial, lowestTicketPrice }: { initial: SiteSettings; lowestTicketPrice: number }) {
  const [settings, setSettings] = React.useState(initial);
  const [priceInput, setPriceInput] = React.useState(initial.ticket_price_from?.toString() ?? "");
  const [newDate, setNewDate] = React.useState("");
  const today = new Date().toISOString().slice(0, 10);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (next: SiteSettings) =>
      clientFetch<SiteSettings>("/api/content/settings", { method: "PUT", body: JSON.stringify(next) }),
    onSuccess: () => toast.success("Saved – the site is updated."),
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const price = priceInput.trim() === "" ? null : Number(priceInput);
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      toast.error("Enter a price in naira, or leave it blank to use the ticket prices.");
      return;
    }
    save.mutate({
      ...settings,
      ticket_price_from: price,
      opening_days: settings.opening_days.trim(),
      opening_hours: settings.opening_hours.trim(),
      notice: settings.notice?.trim() || null,
      hero_video_url: settings.hero_video_url || null,
      hero_image_url: settings.hero_image_url || null,
    });
  }

  function addDate() {
    if (!newDate || settings.extra_open_dates.includes(newDate)) return;
    set("extra_open_dates", [...settings.extra_open_dates, newDate].sort());
    setNewDate("");
  }

  const upcomingDates = settings.extra_open_dates.filter((date) => date >= today);
  const pastCount = settings.extra_open_dates.length - upcomingDates.length;

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Homepage billboard</CardTitle>
          <CardDescription>The first screen visitors see – keep it short and clear.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="price">&ldquo;Tickets from&rdquo; price (₦)</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={priceInput}
              onChange={(event) => setPriceInput(event.target.value.replace(/[^\d]/g, ""))}
              placeholder={`Automatic: ${formatNaira(lowestTicketPrice)}`}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to show the lowest adult ticket price ({formatNaira(lowestTicketPrice)}). Ticket prices
              themselves are edited under Ticket Products.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="days">Opening days</Label>
              <Input id="days" value={settings.opening_days} onChange={(event) => set("opening_days", event.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hours">Opening hours</Label>
              <Input id="hours" value={settings.opening_hours} onChange={(event) => set("opening_hours", event.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hero-video">Hero video</Label>
            <MediaField
              id="hero-video"
              kind="video"
              value={settings.hero_video_url ?? ""}
              onChange={(url) => set("hero_video_url", url || null)}
            />
            <p className="text-xs text-muted-foreground">
              Muted, looping MP4 under 3 MB (about 10–15 seconds at 720p). It plays behind the hero image once the page
              has loaded.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hero-image">Hero image</Label>
            <MediaField
              id="hero-image"
              value={settings.hero_image_url ?? ""}
              onChange={(url) => set("hero_image_url", url || null)}
            />
            <p className="text-xs text-muted-foreground">
              Shown instantly while the video loads, and to visitors on slow data. Landscape, at least 1600px wide.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public holiday openings</CardTitle>
          <CardDescription>
            The park opens Thursday–Sunday. Add Monday–Wednesday public holidays here so visitors can book tickets and
            pre-order food for them. Publishing a &ldquo;Holiday opening&rdquo; event does the same.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-2">
              <Label htmlFor="new-date">Add a date</Label>
              <Input id="new-date" type="date" min={today} value={newDate} onChange={(event) => setNewDate(event.target.value)} />
            </div>
            <Button type="button" variant="outline" onClick={addDate} disabled={!newDate}>
              <CalendarPlus className="size-4" /> Add
            </Button>
          </div>
          {upcomingDates.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {upcomingDates.map((date) => (
                <li key={date} className="flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm">
                  {formatDate(date)}
                  <button
                    type="button"
                    onClick={() => set("extra_open_dates", settings.extra_open_dates.filter((d) => d !== date))}
                    aria-label={`Remove ${formatDate(date)}`}
                    className="grid size-6 place-items-center rounded-full hover:bg-background"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming holiday openings.</p>
          )}
          {pastCount > 0 && (
            <button
              type="button"
              className="w-fit text-xs text-muted-foreground underline"
              onClick={() => set("extra_open_dates", upcomingDates)}
            >
              Clear {pastCount} past date{pastCount === 1 ? "" : "s"}
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site notice</CardTitle>
          <CardDescription>
            A short message in the top bar of every page (not the homepage billboard) – e.g. a closure or a promo.
            Leave blank to hide it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input
            aria-label="Site notice"
            value={settings.notice ?? ""}
            onChange={(event) => set("notice", event.target.value)}
            maxLength={140}
            placeholder="e.g. Open this Monday for Easter – book now!"
          />
          {settings.notice?.trim() && (
            <p className="rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-foreground">
              {settings.notice}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={save.isPending} className="shadow-xl">
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
