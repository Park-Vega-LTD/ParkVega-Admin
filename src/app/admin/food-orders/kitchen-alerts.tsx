"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import type { FoodOrder } from "@/lib/admin-types";
import { formatNaira } from "@/lib/utils";

/**
 * Per-browser settings for the counter screen. Kept in memory as well, so a
 * blocked localStorage only means the setting is forgotten on reload.
 */
const memory = new Map<string, boolean>();
const listeners = new Set<() => void>();

function readSetting(key: string): boolean {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}

function writeSetting(key: string, on: boolean) {
  memory.set(key, on);
  try {
    window.localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStoredToggle(key: string): [boolean, (on: boolean) => void] {
  const on = React.useSyncExternalStore(
    subscribe,
    () => readSetting(key),
    () => false,
  );
  const update = React.useCallback((next: boolean) => writeSetting(key, next), [key]);
  return [on, update];
}

/**
 * A two-tone chime made with Web Audio, so there's no sound file to ship.
 * Browsers only let a page make sound after the user interacts with it, so
 * the context is created or resumed from a tap (`unlock`). `ready` is false
 * until that has happened since the page loaded.
 */
export function useChime() {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const [ready, setReady] = React.useState(false);

  const unlock = React.useCallback(async () => {
    try {
      ctxRef.current ??= new AudioContext();
      await ctxRef.current.resume();
      setReady(ctxRef.current.state === "running");
    } catch {
      setReady(false);
    }
  }, []);

  const play = React.useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== "running") return;
    const start = ctx.currentTime;
    // Three rising notes, loud enough to hear over a busy counter.
    [880, 1175, 1568].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      const t = start + index * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }, []);

  // After a reload the context starts locked; the first tap anywhere unlocks it.
  React.useEffect(() => {
    const onGesture = () => void unlock();
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, [unlock]);

  React.useEffect(() => () => void ctxRef.current?.close(), []);

  return { ready, unlock, play };
}

/**
 * Calls `onNew` with orders that appear in the "placed" column after the
 * first load of a day, so opening the board or switching dates doesn't
 * alert for orders already there.
 */
export function useNewOrders(
  date: string,
  orders: FoodOrder[] | undefined,
  onNew: (orders: FoodOrder[]) => void,
) {
  const seen = React.useRef<{ date: string; ids: Set<string> } | null>(null);
  const onNewRef = React.useRef(onNew);
  React.useEffect(() => {
    onNewRef.current = onNew;
  });

  React.useEffect(() => {
    if (!orders) return;
    if (seen.current?.date !== date) {
      seen.current = { date, ids: new Set(orders.map((order) => order.id)) };
      return;
    }
    const ids = seen.current.ids;
    const fresh = orders.filter((order) => !ids.has(order.id));
    fresh.forEach((order) => ids.add(order.id));
    const placed = fresh.filter((order) => order.status === "placed");
    if (placed.length > 0) onNewRef.current(placed);
  }, [date, orders]);
}

/**
 * Shows "(2) New orders" in the tab title until the board is looked at, for
 * a counter screen that's behind another window.
 */
export function useTitleFlag(count: number, clear: () => void) {
  React.useEffect(() => {
    if (count === 0) return;
    const original = document.title;
    document.title = `(${count}) New order${count === 1 ? "" : "s"} · ${original}`;
    return () => {
      document.title = original;
    };
  }, [count]);

  React.useEffect(() => {
    const onSeen = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) clear();
    };
    window.addEventListener("focus", onSeen);
    document.addEventListener("visibilitychange", onSeen);
    return () => {
      window.removeEventListener("focus", onSeen);
      document.removeEventListener("visibilitychange", onSeen);
    };
  }, [clear]);
}

const watTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  hour: "2-digit",
  minute: "2-digit",
});

const PAYMENT: Record<FoodOrder["payment_status"], string> = {
  counter: "PAY AT COUNTER",
  pending: "ONLINE – NOT YET PAID",
  paid: "PAID ONLINE",
  failed: "ONLINE PAYMENT FAILED – COLLECT AT COUNTER",
};

/**
 * Kitchen slips for a receipt printer (58 or 80 mm) or A4. Rendered into
 * <body> while printing; the print stylesheet hides the rest of the console,
 * so only the slips come out, one per page.
 */
export function PrintSlips({ orders }: { orders: FoodOrder[] }) {
  if (orders.length === 0) return null;
  return createPortal(
    <div id="kitchen-print">
      <style>{`
        #kitchen-print { display: none; }
        @page kitchen-slip { margin: 4mm; }
        @media print {
          body > *:not(#kitchen-print) { display: none !important; }
          #kitchen-print { display: block; page: kitchen-slip; color: #000; background: #fff;
            font: 12pt/1.35 ui-monospace, "Courier New", monospace; }
          #kitchen-print .slip { max-width: 72mm; break-after: page; }
          #kitchen-print .slip:last-child { break-after: auto; }
          #kitchen-print h1 { font-size: 22pt; margin: 0; letter-spacing: 0.05em; }
          #kitchen-print .big { font-size: 15pt; font-weight: 700; }
          #kitchen-print hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
          #kitchen-print ul { list-style: none; padding: 0; margin: 0; }
          #kitchen-print li { margin: 1mm 0; }
          #kitchen-print .row { display: flex; justify-content: space-between; gap: 2mm; }
        }
      `}</style>
      {orders.map((order) => (
        <section key={order.id} className="slip">
          <h1>{order.code}</h1>
          <p className="big">Pickup: {order.pickup_time === "asap" ? "ASAP" : order.pickup_time}</p>
          <p>
            {order.full_name}
            <br />
            {order.whatsapp}
          </p>
          <hr />
          <ul>
            {order.items.map((item) => (
              <li key={`${item.menu_item_id}-${item.restaurant_id}`} className="big">
                {item.quantity} × {item.name}
              </li>
            ))}
          </ul>
          {order.notes ? (
            <>
              <hr />
              <p>NOTE: {order.notes}</p>
            </>
          ) : null}
          <hr />
          <p className="row">
            <span>Total</span>
            <strong>{formatNaira(order.total)}</strong>
          </p>
          <p className="big">{PAYMENT[order.payment_status]}</p>
          <p>
            Ordered {watTime.format(new Date(order.created_at))} · {order.pickup_date}
          </p>
        </section>
      ))}
    </div>,
    document.body,
  );
}

/**
 * Print the given orders. Resolves once the print dialog closes; Chrome's
 * window.print() blocks, other browsers report it through `afterprint`.
 */
export function usePrinter() {
  const [slips, setSlips] = React.useState<FoodOrder[]>([]);

  const print = React.useCallback((orders: FoodOrder[]) => {
    if (orders.length > 0) setSlips(orders);
  }, []);

  React.useEffect(() => {
    if (slips.length === 0) return;
    const done = () => setSlips([]);
    window.addEventListener("afterprint", done, { once: true });
    // Let React commit the slips before the print snapshot is taken.
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [slips]);

  return { slips, print };
}
