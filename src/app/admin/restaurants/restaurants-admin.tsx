"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import type { MenuItem, Restaurant } from "@/types/api";
import { clientFetch } from "@/lib/api.client";
import { formatNaira } from "@/lib/utils";
import {
  AdminTable,
  type AdminColumn,
} from "@/components/parkvega/admin-table";
import {
  BADGE_LABELS,
  MenuItemDialog,
} from "@/components/parkvega/admin/menu-item-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

/** TanStack Query key for the restaurants list (design Section 11). */
const RESTAURANTS_KEY: QueryKey = ["restaurants"];
/** TanStack Query key for a single restaurant's menu (design Section 11). */
const menuKey = (restaurantId: string): QueryKey => ["menu", restaurantId];

/**
 * Restaurant create/update form schema (react-hook-form + zod).
 *
 * Mirrors the editable fields on the {@link Restaurant} type. Nullable REST
 * fields are modelled as optional strings and normalised to `null` before the
 * request is sent.
 */
const restaurantFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  category: z
    .string()
    .min(1, "Category is required")
    .max(80, "Category is too long"),
  description: z.string().max(1000, "Description is too long").optional(),
  location: z.string().max(200, "Location is too long").optional(),
  opening_hours: z.string().max(200, "Opening hours are too long").optional(),
  dietary_info: z.string().max(200, "Dietary info is too long").optional(),
});

type RestaurantFormValues = z.infer<typeof restaurantFormSchema>;

/** A restaurant plus its loaded menu items, used as the admin table row. */
export interface RestaurantWithMenu extends Restaurant {
  menu: MenuItem[];
}

function toFormValues(restaurant?: Restaurant): RestaurantFormValues {
  return {
    name: restaurant?.name ?? "",
    category: restaurant?.category ?? "",
    description: restaurant?.description ?? "",
    location: restaurant?.location ?? "",
    opening_hours: restaurant?.opening_hours ?? "",
    dietary_info: restaurant?.dietary_info ?? "",
  };
}

/** Normalises optional form strings to `null` for the REST payload. */
function toPayload(values: RestaurantFormValues) {
  const trim = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };
  return {
    name: values.name.trim(),
    category: values.category.trim(),
    description: trim(values.description),
    location: trim(values.location),
    opening_hours: trim(values.opening_hours),
    dietary_info: trim(values.dietary_info),
  };
}

/**
 * Create / edit restaurant dialog backed by react-hook-form + zod.
 *
 * On submit it runs a TanStack Query mutation through the BFF data proxy
 * (`POST /api/restaurants` or `PATCH /api/restaurants/:id`), invalidates
 * `['restaurants']`, shows a `sonner` toast, and closes on success.
 *
 * Validates: Requirements 11.5
 */
function RestaurantFormDialog({
  open,
  onOpenChange,
  restaurant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant?: Restaurant;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(restaurant);

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantFormSchema),
    defaultValues: toFormValues(restaurant),
  });

  // Reset the form whenever the dialog is opened for a different record.
  React.useEffect(() => {
    if (open) {
      form.reset(toFormValues(restaurant));
    }
  }, [open, restaurant, form]);

  const mutation = useMutation({
    mutationFn: (values: RestaurantFormValues) =>
      clientFetch(
        isEdit ? `/api/restaurants/${restaurant!.id}` : "/api/restaurants",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(toPayload(values)),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESTAURANTS_KEY });
      toast.success(isEdit ? "Restaurant updated." : "Restaurant created.");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit restaurant" : "New restaurant"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the restaurant details and save your changes."
              : "Add a new restaurant to the park."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="restaurant-form"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lagoon Grill" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Casual dining" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Short description shown to guests."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Near the Wave Pool" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="opening_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening hours</FormLabel>
                    <FormControl>
                      <Input placeholder="10:00 – 20:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dietary_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary info</FormLabel>
                  <FormControl>
                    <Input placeholder="Vegetarian & halal options" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="restaurant-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create restaurant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Menu items for a single restaurant.
 *
 * Each switch marks an item in stock / sold out by optimistically flipping
 * its `active` flag, then runs a
 * mutation through the BFF data proxy (`PATCH /api/menu-items/:id`) and
 * invalidates `['menu', restaurantId]`, rolling back on failure. The pencil
 * opens {@link MenuItemDialog} for the photo, labels, combo contents, price
 * and the rest.
 *
 * Validates: Requirements 11.5
 */
function MenuItemToggles({
  restaurantId,
  items,
}: {
  restaurantId: string;
  items: MenuItem[];
}) {
  const queryClient = useQueryClient();
  const [menu, setMenu] = React.useState<MenuItem[]>(items);
  const [editing, setEditing] = React.useState<MenuItem | null>(null);

  // Keep local state in sync when the server-provided list changes.
  const [lastItems, setLastItems] = React.useState<MenuItem[]>(items);
  if (items !== lastItems) {
    setLastItems(items);
    setMenu(items);
  }

  const mutation = useMutation<
    unknown,
    Error,
    { item: MenuItem; active: boolean },
    { previous: MenuItem[] }
  >({
    mutationFn: ({ item, active }) =>
      clientFetch(`/api/menu-items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onMutate: ({ item, active }) => {
      const previous = menu;
      setMenu((current) =>
        current.map((m) => (m.id === item.id ? { ...m, active } : m)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context) setMenu(context.previous);
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Menu item updated.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: menuKey(restaurantId) });
    },
  });

  if (menu.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No menu items</span>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {menu.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Switch
              aria-label={`${item.name} in stock`}
              checked={item.active}
              disabled={mutation.isPending}
              onCheckedChange={(active) => mutation.mutate({ item, active })}
            />
            <span className="text-sm">{item.name}</span>
            {/* Switched-off items show as "Sold out" on the public menu and can't be ordered. */}
            <span className={item.active ? "text-xs font-semibold text-primary-ink" : "text-xs font-semibold text-destructive"}>
              {item.active ? "In stock" : "Sold out"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatNaira(item.price)}
            </span>
            {item.image_url ? (
              <ImageIcon className="size-3.5 text-muted-foreground" aria-label="Has a photo" />
            ) : null}
            {item.popular ? (
              <Badge variant="secondary" className="text-[10px]">
                Popular
              </Badge>
            ) : null}
            {(item.badges ?? []).map((badge) => (
              <Badge key={badge} variant="outline" className="text-[10px]">
                {BADGE_LABELS[badge] ?? badge}
              </Badge>
            ))}
            {(item.includes ?? []).length > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                Combo · {item.includes.length}
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Edit ${item.name}`}
              onClick={() => setEditing(item)}
            >
              <Pencil className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <MenuItemDialog
        item={editing}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={(saved) => {
          setMenu((current) => current.map((m) => (m.id === saved.id ? saved : m)));
          queryClient.invalidateQueries({ queryKey: menuKey(restaurantId) });
        }}
      />
    </>
  );
}

/**
 * Delete-restaurant confirmation + mutation.
 *
 * Runs `DELETE /api/restaurants/:id` through the BFF data proxy and
 * invalidates `['restaurants']` on success.
 *
 * Validates: Requirements 11.5
 */
function DeleteRestaurantButton({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      clientFetch(`/api/restaurants/${restaurant.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESTAURANTS_KEY });
      toast.success("Restaurant deleted.");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete ${restaurant.name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {restaurant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the restaurant and its menu. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Client wrapper for the `/admin/restaurants` page (Requirement 11.5).
 *
 * Renders the reused generic {@link AdminTable} for the restaurant list with:
 *  - an active/inactive status toggle (optimistic update via the table's
 *    `onMutate` pipeline → `PATCH /api/restaurants/:id`, invalidates
 *    `['restaurants']`),
 *  - per-row edit (dialog, `PATCH`) and delete (`DELETE`) actions,
 *  - expandable menu-item status toggles (`PATCH /api/menu-items/:id`,
 *    invalidates `['menu', id]`),
 *  - a "New restaurant" dialog (`POST /api/restaurants`).
 *
 * All mutations go through `clientFetch` to the BFF data proxy — Client
 * Components never call the REST API directly (Requirement 14.2).
 *
 * Validates: Requirements 11.5
 */
export function RestaurantsAdmin({
  restaurants,
}: {
  restaurants: RestaurantWithMenu[];
}) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Restaurant | null>(null);

  const columns: AdminColumn<RestaurantWithMenu>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.name}</span>
            {row.location ? (
              <span className="text-xs text-muted-foreground">
                {row.location}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{row.category}</span>
        ),
      },
      {
        id: "menu",
        header: "Menu items",
        cell: (row) => (
          <MenuItemToggles restaurantId={row.id} items={row.menu} />
        ),
      },
      {
        id: "status",
        header: "Active",
        cell: (row, mutate) => (
          <Switch
            aria-label={`Toggle ${row.name} active`}
            checked={row.active}
            onCheckedChange={(active) =>
              mutate({
                row,
                apply: (current) => ({ ...current, active }),
                successMessage: active
                  ? "Restaurant activated."
                  : "Restaurant deactivated.",
              })
            }
          />
        ),
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        className: "text-right",
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Edit ${row.name}`}
              onClick={() => setEditing(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <DeleteRestaurantButton restaurant={row} />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Restaurants</h1>
          <p className="text-sm text-muted-foreground">
            Manage restaurants, mark dishes sold out, and edit each dish&apos;s photo, labels and combo contents.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New restaurant
        </Button>
      </header>

      <AdminTable<RestaurantWithMenu>
        columns={columns}
        data={restaurants}
        emptyMessage="No restaurants yet. Create your first one."
        onMutate={{
          path: ({ row }) => `/api/restaurants/${row.id}`,
          method: "PATCH",
          body: ({ row, apply }) => ({ active: apply(row).active }),
          invalidateKeys: [RESTAURANTS_KEY],
        }}
      />

      <RestaurantFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RestaurantFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        restaurant={editing ?? undefined}
      />
    </section>
  );
}
