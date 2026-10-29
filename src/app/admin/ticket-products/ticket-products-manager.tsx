"use client";

import * as React from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { clientFetch } from "@/lib/api.client";
import { formatNaira } from "@/lib/utils";
import type { PricingTier, TicketProduct } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/** TanStack Query key for the ticket products list (design Section 11). */
const TICKET_PRODUCTS_KEY = ["ticket-products"] as const;

// ---------------------------------------------------------------------------
// Validation schemas (react-hook-form + zod)
// ---------------------------------------------------------------------------

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});
type CreateProductValues = z.infer<typeof createProductSchema>;

const pricingTierSchema = z.object({
  category: z.enum(["ADULT", "CHILD", "INFANT"]),
  price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .int("Price must be a whole number")
    .min(0, "Price cannot be negative"),
  valid_from: z.string().min(1, "Start date is required"),
  valid_to: z.string().optional(),
});
type PricingTierValues = z.infer<typeof pricingTierSchema>;

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export function TicketProductsManager({
  initialProducts,
}: {
  initialProducts: TicketProduct[];
}) {
  // Seed the client cache with the SSR data so the list is populated on first
  // paint and stays in sync with mutation invalidations.
  const { data: products = initialProducts } = useQuery({
    queryKey: TICKET_PRODUCTS_KEY,
    queryFn: () => clientFetch<TicketProduct[]>("/api/ticket-products"),
    initialData: initialProducts,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CreateProductDialog />
      </div>

      {products.length === 0 ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          No ticket products yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: TicketProduct }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="truncate">{product.name}</CardTitle>
          {product.description ? (
            <CardDescription className="line-clamp-2">
              {product.description}
            </CardDescription>
          ) : null}
        </div>
        <Badge variant={product.active ? "default" : "secondary"}>
          {product.active ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pricing tiers
          </span>
          {product.pricing_tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pricing tiers yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {product.pricing_tiers.map((tier) => (
                <PricingTierRow key={tier.id} tier={tier} />
              ))}
            </ul>
          )}
        </div>
        <AddPricingTierDialog productId={product.id} />
      </CardContent>
    </Card>
  );
}

function PricingTierRow({ tier }: { tier: PricingTier }) {
  return (
    <li className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
      <span className="font-medium capitalize">{tier.category.toLowerCase()}</span>
      <span>{formatNaira(tier.price)}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Create product dialog — POST /api/ticket-products
// ---------------------------------------------------------------------------

function CreateProductDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const form = useForm<CreateProductValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateProductValues) =>
      clientFetch<TicketProduct>("/api/ticket-products", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          description: values.description?.trim() ? values.description : null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_PRODUCTS_KEY });
      toast.success("Ticket product created.");
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
        <Button>Create ticket product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create ticket product</DialogTitle>
          <DialogDescription>
            Add a new ticket product. You can add pricing tiers afterwards.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Day Pass" {...field} />
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
                      placeholder="Optional description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add pricing tier dialog — POST /api/ticket-products/:id/pricing-tiers
// ---------------------------------------------------------------------------

function AddPricingTierDialog({ productId }: { productId: string }) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const form = useForm<PricingTierValues>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      category: "ADULT",
      price: 0,
      valid_from: "",
      valid_to: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PricingTierValues) =>
      clientFetch<PricingTier>(
        `/api/ticket-products/${productId}/pricing-tiers`,
        {
          method: "POST",
          body: JSON.stringify({
            category: values.category,
            price: values.price,
            valid_from: values.valid_from,
            valid_to: values.valid_to?.trim() ? values.valid_to : null,
          }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_PRODUCTS_KEY });
      toast.success("Pricing tier added.");
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
        <Button variant="outline" size="sm">
          Add pricing tier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add pricing tier</DialogTitle>
          <DialogDescription>
            Set the price for a visitor category and its validity window.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ADULT">Adult</SelectItem>
                      <SelectItem value="CHILD">Child</SelectItem>
                      <SelectItem value="INFANT">Infant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valid_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid from</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valid_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid to (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding…" : "Add tier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
