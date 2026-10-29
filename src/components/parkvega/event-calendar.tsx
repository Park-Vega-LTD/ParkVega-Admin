"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { EVENT_CATEGORIES, categoryOf } from "@/lib/events";
import { isOpenDate } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/api";

type Entry = { event: Event; time: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Month calendar of event sessions, coloured by category, with the days the
 * park is open highlighted. Used on the public events page and in admin
 * (where `onSelect` opens the event for editing).
 */
export function EventCalendar({
  events,
  extraOpenDates,
  onSelect,
  showDrafts = false,
}: {
  events: Event[];
  extraOpenDates?: string[];
  onSelect?: (event: Event) => void;
  showDrafts?: boolean;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const event of events) {
      if (event.status === "CANCELLED" || (!showDrafts && event.status !== "PUBLISHED")) continue;
      for (const session of event.sessions ?? []) {
        const date = session.session_date.slice(0, 10);
        map.set(date, [...(map.get(date) ?? []), { event, time: session.start_time?.slice(0, 5) ?? "" }]);
      }
    }
    return map;
  }, [events, showDrafts]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  // Monday-first grid offset.
  const offset = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7;
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const step = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold" aria-live="polite">{monthLabel}</h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Previous month" className="grid size-11 place-items-center rounded-full hover:bg-muted">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next month" className="grid size-11 place-items-center rounded-full hover:bg-muted">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, i) => (
          <li key={`pad-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = iso(cursor.year, cursor.month, i + 1);
          const entries = byDate.get(date) ?? [];
          const open = isOpenDate(date, extraOpenDates);
          return (
            <li
              key={date}
              className={cn(
                "min-h-16 rounded-xl border p-1 text-left sm:min-h-24 sm:p-1.5",
                open ? "border-primary/20 bg-ocean-soft/60" : "border-transparent bg-muted/40 text-muted-foreground",
                date === today && "ring-2 ring-primary",
                date < today && "opacity-50",
              )}
            >
              <span className="block text-xs font-bold">{i + 1}</span>
              <ul className="mt-0.5 grid gap-0.5">
                {entries.map(({ event, time }) => {
                  const category = categoryOf(event);
                  const label = `${event.title}${time ? ` · ${time}` : ""}`;
                  const chip = cn(
                    "block w-full truncate rounded-md px-1 py-0.5 text-left text-[10px] font-semibold sm:text-xs",
                    category.className,
                    event.status !== "PUBLISHED" && "opacity-60 outline-dashed outline-1",
                  );
                  return (
                    <li key={`${event.id}-${time}`}>
                      {onSelect ? (
                        <button type="button" onClick={() => onSelect(event)} title={label} className={chip}>
                          {label}
                        </button>
                      ) : (
                        <a href={`#event-${event.id}`} title={label} className={chip}>
                          {label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-ocean-soft ring-1 ring-primary/30" /> Park open
        </li>
        {Object.values(EVENT_CATEGORIES).map(({ label, className }) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded", className)} /> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
