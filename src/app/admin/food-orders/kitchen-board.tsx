"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Printer } from "lucide-react";
import { toast } from "sonner";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { clientFetch } from "@/lib/api.client";
import { todayWat, type FoodOrder, type FoodOrderStatus } from "@/lib/admin-types";
import { formatNaira } from "@/lib/utils";

import {
  PrintSlips,
  useChime,
  useNewOrders,
  usePrinter,
  useStoredToggle,
  useTitleFlag,
} from "./kitchen-alerts";

/** How often the board asks for new orders, also while the tab is hidden. */
export const KITCHEN_POLL_MS = 15_000;

const COLUMNS: { status: FoodOrderStatus; title: string }[] = [
  { status: "placed", title: "New" },
  { status: "preparing", title: "Preparing" },
  { status: "ready", title: "Ready for pickup" },
  { status: "collected", title: "Collected" },
];

/** The one step forward from each active status. */
const NEXT: Partial<Record<FoodOrderStatus, { status: FoodOrderStatus; label: string }>> = {
  placed: { status: "preparing", label: "Start preparing" },
  preparing: { status: "ready", label: "Mark ready" },
  ready: { status: "collected", label: "Mark collected" },
};

const PAYMENT_LABELS: Record<FoodOrder["payment_status"], string> = {
  counter: "Pay at counter",
  pending: "Online payment pending",
  paid: "Paid online",
  failed: "Payment failed",
};

/** "asap" or "13:00" → shown as the pickup slot; asap orders sort first. */
function pickupSortKey(order: FoodOrder) {
  return order.pickup_time === "asap" ? "00:00" : order.pickup_time;
}

export function KitchenBoard() {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState(todayWat());
  const ordersKey = ["admin-food-orders", date];

  const orders = useQuery({
    queryKey: ordersKey,
    queryFn: () => clientFetch<FoodOrder[]>(`/api/food-orders?date=${date}`),
    refetchInterval: KITCHEN_POLL_MS,
    // The counter screen is often behind another window; keep checking.
    refetchIntervalInBackground: true,
  });

  const [soundOn, setSoundOn] = useStoredToggle("kitchen-sound");
  const [autoPrint, setAutoPrint] = useStoredToggle("kitchen-auto-print");
  const chime = useChime();
  const printer = usePrinter();
  const [unseen, setUnseen] = React.useState(0);
  const clearUnseen = React.useCallback(() => setUnseen(0), []);
  useTitleFlag(unseen, clearUnseen);

  useNewOrders(date, orders.data, (fresh) => {
    if (soundOn) chime.play();
    if (autoPrint) printer.print(fresh);
    if (document.visibilityState !== "visible" || !document.hasFocus()) {
      setUnseen((count) => count + fresh.length);
    }
    toast.info(
      fresh.length === 1
        ? `New order ${fresh[0].code}`
        : `${fresh.length} new orders: ${fresh.map((order) => order.code).join(", ")}`,
    );
  });

  const update = useMutation({
    mutationFn: ({ order, status }: { order: FoodOrder; status: FoodOrderStatus }) =>
      clientFetch<FoodOrder>(`/api/food-orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: (order) => {
      queryClient.setQueryData<FoodOrder[]>(ordersKey, (current) =>
        current?.map((existing) => (existing.id === order.id ? order : existing)),
      );
      if (order.status === "cancelled") toast.success(`Order ${order.code} cancelled.`);
    },
    onError: (error) => toast.error(error.message),
  });

  const all = [...(orders.data ?? [])].sort((a, b) => pickupSortKey(a).localeCompare(pickupSortKey(b)));
  const cancelled = all.filter((order) => order.status === "cancelled");

  const newOrders = all.filter((order) => order.status === "placed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="kitchen-date">Pickup date</Label>
          <Input id="kitchen-date" type="date" className="w-48" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch
              id="kitchen-sound"
              checked={soundOn}
              onCheckedChange={(on) => {
                setSoundOn(on);
                // The switch tap is the gesture browsers need before playing sound.
                if (on) void chime.unlock().then(chime.play);
              }}
            />
            <Label htmlFor="kitchen-sound" className="flex items-center gap-1.5">
              {soundOn ? <Bell className="size-4" /> : <BellOff className="size-4" />}
              Sound for new orders
            </Label>
          </div>
          {soundOn && !chime.ready ? (
            <p className="text-xs font-semibold text-destructive">Tap anywhere on the page to allow sound.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Switch id="kitchen-auto-print" checked={autoPrint} onCheckedChange={setAutoPrint} />
            <Label htmlFor="kitchen-auto-print" className="flex items-center gap-1.5">
              <Printer className="size-4" />
              Print new orders automatically
            </Label>
          </div>
          {autoPrint ? (
            <p className="max-w-xs text-xs text-muted-foreground">
              The print dialog opens for each new order. To skip it, start Chrome on this computer with{" "}
              <code>--kiosk-printing</code> and the receipt printer set as default.
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={newOrders.length === 0}
          onClick={() => printer.print(newOrders)}
        >
          <Printer className="size-4" />
          Print all new ({newOrders.length})
        </Button>
      </div>

      {orders.isError ? <LoadError error={orders.error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = all.filter((order) => order.status === column.status);
          return (
            <div key={column.status} className="space-y-3 rounded-2xl border border-border bg-card p-3">
              <h2 className="flex items-center justify-between px-1 font-display text-lg font-semibold">
                {column.title}
                <span className="text-sm font-normal text-muted-foreground">{items.length}</span>
              </h2>
              {orders.isPending ? (
                <p className="px-1 text-sm text-muted-foreground">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-1 text-sm text-muted-foreground">Nothing here.</p>
              ) : (
                items.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={update.isPending && update.variables?.order.id === order.id}
                    onChange={(status) => update.mutate({ order, status })}
                    onPrint={() => printer.print([order])}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {cancelled.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Cancelled: {cancelled.map((order) => order.code).join(", ")}
        </p>
      ) : null}

      <PrintSlips orders={printer.slips} />
    </div>
  );
}

function OrderCard({
  order,
  busy,
  onChange,
  onPrint,
}: {
  order: FoodOrder;
  busy: boolean;
  onChange: (status: FoodOrderStatus) => void;
  onPrint: () => void;
}) {
  const next = NEXT[order.status];
  const restaurants = [...new Set(order.items.map((item) => item.restaurant_name))];

  return (
    <article className="space-y-3 rounded-xl border border-border bg-background p-3 text-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-base font-bold">{order.code}</p>
          <p className="text-muted-foreground">{order.full_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline">{order.pickup_time === "asap" ? "ASAP" : order.pickup_time}</Badge>
          <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Print order ${order.code}`} onClick={onPrint}>
            <Printer className="size-3.5" />
          </Button>
        </div>
      </header>

      <ul className="space-y-0.5">
        {order.items.map((item) => (
          <li key={`${item.menu_item_id}-${item.restaurant_id}`}>
            <span className="font-semibold">{item.quantity}×</span> {item.name}
          </li>
        ))}
      </ul>
      {restaurants.length > 0 ? <p className="text-xs text-muted-foreground">{restaurants.join(" · ")}</p> : null}
      {order.notes ? <p className="rounded-lg bg-muted p-2 text-xs">“{order.notes}”</p> : null}

      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{formatNaira(order.total)}</span>
        <Badge variant={order.payment_status === "failed" ? "destructive" : "secondary"}>
          {PAYMENT_LABELS[order.payment_status]}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        <a href={`https://wa.me/${order.whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
          WhatsApp {order.whatsapp}
        </a>
      </p>

      {order.status !== "collected" ? (
        <div className="flex gap-2">
          {next ? (
            <Button size="sm" className="flex-1" disabled={busy} onClick={() => onChange(next.status)}>
              {next.label}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Cancel order ${order.code}?`)) onChange("cancelled");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </article>
  );
}
