"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Small, dependency-free charts for the analytics screen. Every chart shows
 * one measure in one hue (--primary-ink), so identity never rests on colour;
 * values are always available as text (direct labels or the table toggle).
 */

const MARK = "var(--primary-ink)";

/** ₦1.2m, ₦450k, ₦900. */
export function compactNaira(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}₦${trim(abs / 1_000_000)}m`;
  if (abs >= 1_000) return `${sign}₦${trim(abs / 1_000)}k`;
  return `${sign}₦${Math.round(abs)}`;
}

function trim(n: number): string {
  return n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, "");
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** A round step (1, 2, 2.5 or 5 × 10ⁿ) that covers `span` in about four steps. */
function niceStep(span: number): number {
  if (span <= 0) return 1;
  const raw = span / 4;
  const base = Math.pow(10, Math.floor(Math.log10(raw)));
  return ([1, 2, 2.5, 5, 10].map((m) => m * base).find((s) => s >= raw) ?? base * 10);
}

/** Axis bounds and ticks on round numbers, always including zero. */
function niceScale(values: number[]): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const step = niceStep(hi - lo || 1);
  const min = Math.floor(lo / step) * step;
  const max = Math.max(step, Math.ceil(hi / step) * step);
  const ticks: number[] = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { min, max, ticks };
}

export type SeriesPoint = { key: string; label: string; value: number };

/**
 * One measure over time as columns (each period is a separate total), with a
 * recessive grid and a tooltip on hover or touch. Negative periods (more
 * refunded than paid) go below the zero line.
 */
export function TimeChart({
  points,
  format,
  axisFormat = format,
  ariaLabel,
  height = 240,
}: {
  points: SeriesPoint[];
  format: (value: number) => string;
  axisFormat?: (value: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);

  const pad = { top: 12, right: 12, bottom: 28, left: 56 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const { min, max, ticks } = niceScale(points.map((p) => p.value));
  const span = max - min || 1;
  const slot = points.length ? innerW / points.length : innerW;
  // Thin columns with a gap of at least 2px between them.
  const barW = Math.max(2, Math.min(28, slot * 0.7, slot - 2));
  const x = (i: number) => pad.left + slot * i + slot / 2;
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerW / 72))));

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rel = (event.clientX - rect.left) / Math.max(1, rect.width);
    setHover(Math.min(points.length - 1, Math.max(0, Math.floor(rel * points.length))));
  }

  /** A column from the zero line with a 4px rounded end away from it. */
  function column(i: number, value: number): string {
    const left = x(i) - barW / 2;
    const zero = y(0);
    const end = y(value);
    const h = Math.abs(zero - end);
    if (h < 0.5) return "";
    const r = Math.min(4, barW / 2, h);
    const up = value >= 0;
    const top = up ? end : zero;
    const bottom = up ? zero : end;
    return up
      ? `M${left},${bottom}V${top + r}Q${left},${top} ${left + r},${top}H${left + barW - r}Q${left + barW},${top} ${left + barW},${top + r}V${bottom}Z`
      : `M${left},${top}V${bottom - r}Q${left},${bottom} ${left + r},${bottom}H${left + barW - r}Q${left + barW},${bottom} ${left + barW},${bottom - r}V${top}Z`;
  }

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                {axisFormat(t)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="var(--muted-foreground)" strokeWidth={1} />
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={p.key} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {p.label}
              </text>
            ) : null,
          )}
          {hovered && hover !== null ? (
            <rect x={x(hover) - slot / 2} y={pad.top} width={slot} height={innerH} fill="var(--muted)" pointerEvents="none" />
          ) : null}
          {points.map((p, i) => (
            <path key={p.key} d={column(i, p.value)} fill={MARK} fillOpacity={hover === null || hover === i ? 1 : 0.55} />
          ))}
          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      ) : null}
      {hovered && hover !== null ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: Math.max(y(hovered.value) - 10, 48) }}
        >
          <p className="font-semibold text-foreground">{hovered.label}</p>
          <p className="text-muted-foreground">{format(hovered.value)}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal bars with the value written beside each one: for funnels,
 * weekdays and other short lists where the label matters most.
 */
export function BarList({
  rows,
  format = (v) => v.toLocaleString("en-NG"),
  note,
  className,
}: {
  rows: { key: string; label: string; value: number; detail?: string }[];
  format?: (value: number) => string;
  note?: (row: { value: number }, index: number) => string | null;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className={cn("grid gap-3", className)}>
      {rows.map((row, i) => {
        const extra = note?.(row, i);
        return (
          <li key={row.key} className="grid gap-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-muted-foreground" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-foreground">{format(row.value)}</span>
                {extra ? <span className="ml-1.5 text-xs text-muted-foreground">{extra}</span> : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-full rounded-full"
                style={{ width: `${(row.value / max) * 100}%`, background: MARK, minWidth: row.value > 0 ? 6 : 0 }}
                title={`${row.label}: ${format(row.value)}${row.detail ? ` (${row.detail})` : ""}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
