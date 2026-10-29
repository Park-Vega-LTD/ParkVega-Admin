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
import { THRILL_LEVELS } from "@/lib/attractions";
import type { Attraction } from "@/types/api";

type Values = {
  name: string;
  category: string;
  description: string;
  image_url: string;
  thrill_level: string;
  height_requirement: string;
  who_it_suits: string;
  safety_precautions: string;
  sort_order: string;
};

function toValues(attraction: Attraction | null): Values {
  return {
    name: attraction?.name ?? "",
    category: attraction?.category ?? "Slides",
    description: attraction?.description ?? "",
    image_url: attraction?.image_url ?? "",
    thrill_level: attraction?.thrill_level ?? "",
    height_requirement: attraction?.height_requirement ?? "",
    who_it_suits: attraction?.who_it_suits ?? "",
    safety_precautions: attraction?.safety_precautions ?? "",
    sort_order: attraction?.sort_order?.toString() ?? "0",
  };
}

const CATEGORIES = ["Slides", "Pools", "Kids", "Relaxation", "Food & drink"];
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

/**
 * Create (`POST /api/attractions`) or edit (`PATCH /api/attractions/:id`) an
 * attraction with every field the brief asks for on attraction pages: name,
 * photo, who it suits, thrill level, height requirement and safety
 * precautions.
 */
export function AttractionDialog({
  attraction,
  open,
  onOpenChange,
}: {
  attraction: Attraction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [values, setValues] = React.useState(() => toValues(attraction));
  const [last, setLast] = React.useState(attraction);
  if (attraction !== last) {
    setLast(attraction);
    setValues(toValues(attraction));
  }
  const set = (key: keyof Values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (next: Values) => {
      const nullable = (value: string) => value.trim() || null;
      const body = JSON.stringify({
        name: next.name.trim(),
        category: next.category,
        description: nullable(next.description),
        image_url: nullable(next.image_url),
        thrill_level: nullable(next.thrill_level),
        height_requirement: nullable(next.height_requirement),
        who_it_suits: nullable(next.who_it_suits),
        safety_precautions: nullable(next.safety_precautions),
        sort_order: Number(next.sort_order) || 0,
      });
      return attraction
        ? clientFetch<Attraction>(`/api/attractions/${attraction.id}`, { method: "PATCH", body })
        : clientFetch<Attraction>("/api/attractions", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(attraction ? "Attraction updated." : "Attraction added.");
      queryClient.invalidateQueries({ queryKey: ["attractions"] });
      router.refresh();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (values.name.trim().length < 2) {
      toast.error("Add a name.");
      return;
    }
    save.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{attraction ? `Edit ${attraction.name}` : "Add attraction"}</DialogTitle>
          <DialogDescription>
            Fill in every field – Google and AI assistants use these details to answer questions like &ldquo;is it
            safe for kids?&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="attr-name">Name</Label>
            <Input id="attr-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Freefall Slide" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attr-category">Category</Label>
            <select id="attr-category" className={selectClass} value={values.category} onChange={(e) => set("category", e.target.value)}>
              {[...new Set([values.category, ...CATEGORIES])].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="attr-image">Photo</Label>
            <MediaField id="attr-image" value={values.image_url} onChange={(url) => set("image_url", url)} />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="attr-description">Description</Label>
            <Textarea id="attr-description" rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What the ride is like, in a sentence or two." />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="attr-suits">Who it suits</Label>
            <Input id="attr-suits" value={values.who_it_suits} onChange={(e) => set("who_it_suits", e.target.value)} placeholder="e.g. Teens and adults who love a big drop" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attr-thrill">Thrill level</Label>
            <select id="attr-thrill" className={selectClass} value={values.thrill_level} onChange={(e) => set("thrill_level", e.target.value)}>
              <option value="">Not set</option>
              {THRILL_LEVELS.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attr-height">Height requirement</Label>
            <Input id="attr-height" value={values.height_requirement} onChange={(e) => set("height_requirement", e.target.value)} placeholder="e.g. 120cm or taller" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="attr-safety">Safety precautions (one per line)</Label>
            <Textarea
              id="attr-safety"
              rows={4}
              value={values.safety_precautions}
              onChange={(e) => set("safety_precautions", e.target.value)}
              placeholder={"Ride lying on your back, feet first\nNo jewellery or glasses\nNot suitable during pregnancy"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="attr-order">Display order</Label>
            <Input id="attr-order" type="number" inputMode="numeric" value={values.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            <p className="text-xs text-muted-foreground">Lower numbers appear first on the site.</p>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {attraction ? "Save changes" : "Add attraction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
