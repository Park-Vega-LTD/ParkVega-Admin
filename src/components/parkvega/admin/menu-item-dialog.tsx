"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/api.client";
import type { MenuItem, MenuItemBadge } from "@/types/api";

/** Labels as the public menu prints them. */
export const BADGE_LABELS: Record<MenuItemBadge, string> = {
  KIDS_SPECIAL: "Kids' special",
  BIG_APPETITE: "Big appetite",
  FAMILY_FAVOURITE: "Family favourite",
};

const BADGES = Object.keys(BADGE_LABELS) as MenuItemBadge[];

type Values = {
  name: string;
  category: string;
  price: string;
  description: string;
  image_url: string;
  popular: boolean;
  badges: MenuItemBadge[];
  includes: string;
};

function toValues(item: MenuItem | null): Values {
  return {
    name: item?.name ?? "",
    category: item?.category ?? "",
    price: item ? String(item.price) : "",
    description: item?.description ?? "",
    image_url: item?.image_url ?? "",
    popular: item?.popular ?? false,
    badges: item?.badges ?? [],
    includes: (item?.includes ?? []).join("\n"),
  };
}

/**
 * Edit one menu item (`PATCH /api/menu-items/:id`): photo, name, section,
 * price, description, "Popular", the printed labels and what a combo comes
 * with. Sold out is the switch in the menu list, not here.
 */
export function MenuItemDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: MenuItem) => void;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState(() => toValues(item));
  const [last, setLast] = React.useState(item);
  if (item !== last) {
    setLast(item);
    setValues(toValues(item));
  }
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (next: Values) =>
      clientFetch<MenuItem>(`/api/menu-items/${item!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: next.name.trim(),
          category: next.category.trim(),
          price: Number(next.price),
          description: next.description.trim() || null,
          image_url: next.image_url.trim() || null,
          popular: next.popular,
          badges: next.badges,
          includes: next.includes
            .split("\n")
            .map((part) => part.trim())
            .filter(Boolean),
        }),
      }),
    onSuccess: (saved) => {
      toast.success(`${saved.name} updated.`);
      onSaved(saved);
      router.refresh();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) return void toast.error("Add a name.");
    if (!values.category.trim()) return void toast.error("Add a menu section.");
    const price = Number(values.price);
    if (values.price.trim() === "" || !Number.isFinite(price) || price < 0) {
      return void toast.error("Enter a price in naira, e.g. 4500.");
    }
    save.mutate(values);
  }

  function toggleBadge(badge: MenuItemBadge, on: boolean) {
    set(
      "badges",
      // Keep the printed order regardless of click order.
      BADGES.filter((b) => (b === badge ? on : values.badges.includes(b))),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : "Edit menu item"}</DialogTitle>
          <DialogDescription>
            Changes show on the public menu within a minute. Re-running the menu seed resets price, section, labels
            and combo contents from the menu data file; photos and descriptions are kept.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="menu-image">Photo</Label>
            <MediaField id="menu-image" value={values.image_url} onChange={(url) => set("image_url", url)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-name">Name</Label>
            <Input id="menu-name" value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={150} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-category">Menu section</Label>
            <Input
              id="menu-category"
              value={values.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="e.g. Combos"
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="menu-price">Price (₦)</Label>
            <Input
              id="menu-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 self-end pb-2">
            <Switch id="menu-popular" checked={values.popular} onCheckedChange={(on) => set("popular", on)} />
            <Label htmlFor="menu-popular">Popular choice</Label>
          </div>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Labels</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {BADGES.map((badge) => (
                <label key={badge} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={values.badges.includes(badge)}
                    onChange={(e) => toggleBadge(badge, e.target.checked)}
                  />
                  {BADGE_LABELS[badge]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="menu-includes">Comes with (combos only, one per line)</Label>
            <Textarea
              id="menu-includes"
              rows={4}
              value={values.includes}
              onChange={(e) => set("includes", e.target.value)}
              placeholder={"Burger Max\n4 wings\nChips\nSoda"}
            />
            <p className="text-xs text-muted-foreground">Leave empty for a single dish or drink.</p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="menu-description">Description</Label>
            <Textarea
              id="menu-description"
              rows={2}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={1000}
              placeholder="Optional. A line about the dish."
            />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !item}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
