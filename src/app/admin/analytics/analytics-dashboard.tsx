"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Compass, Download, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

import { BarList, TimeChart, compactNaira } from "@/components/parkvega/analytics/charts";
import { LoadError } from "@/components/parkvega/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientFetch } from "@/lib/api.client";
import {
  todayWat,
  type AnalyticsAttribution,
  type AnalyticsDemand,
  type AnalyticsExportReport,
  type AnalyticsFigures,
  type AnalyticsFunnel,
  type AnalyticsInterval,
  type AnalyticsProducts,
  type AnalyticsSummary,
  type AnalyticsTimeseries,
  type AttributionGroup,
  type AttributionModel,
} from "@/lib/admin-types";
import { cn, formatNaira } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Dates (park days, West Africa Time)
// ---------------------------------------------------------------------------

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysIn(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

type Preset = "7d" | "30d" | "month" | "last-month" | "year" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "Year to date" },
  { key: "custom", label: "Custom" },
];

function presetRange(preset: Exclude<Preset, "custom">, today: string): [string, string] {
  switch (preset) {
    case "7d":
      return [addDays(today, -6), today];
    case "30d":
      return [addDays(today, -29), today];
    case "month":
      return [`${today.slice(0, 8)}01`, today];
    case "last-month": {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = addDays(firstThis, -1);
      return [`${lastPrev.slice(0, 8)}01`, lastPrev];
    }
    case "year":
      return [`${today.slice(0, 4)}-01-01`, today];
  }
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${SHORT_MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

function longDate(date: string): string {
  return `${shortDate(date)} ${date.slice(0, 4)}`;
}

function periodLabel(period: string, interval: AnalyticsInterval): string {
  if (interval === "month") return `${SHORT_MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(2, 4)}`;
  if (interval === "week") return `w/c ${shortDate(period)}`;
  return shortDate(period);
}

function autoInterval(days: number): AnalyticsInterval {
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

const percent = (value: number | null) => (value === null ? "–" : `${Math.round(value * 100)}%`);
const count = (value: number | null | undefined) => (value == null ? "–" : value.toLocaleString("en-NG"));

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function AnalyticsDashboard() {
  const today = todayWat();
  const [preset, setPreset] = React.useState<Preset>("30d");
  const [custom, setCustom] = React.useState<[string, string]>(presetRange("30d", today));
  const [from, to] = preset === "custom" ? custom : presetRange(preset, today);
  const days = daysIn(from, to);
  const valid = Boolean(from && to && from <= to && days <= 366);
  const [intervalChoice, setIntervalChoice] = React.useState<AnalyticsInterval | "auto">("auto");
  const interval = intervalChoice === "auto" ? autoInterval(days) : intervalChoice;

  const range = `from=${from}&to=${to}`;
  const summary = useQuery({
    queryKey: ["analytics-summary", from, to],
    queryFn: () => clientFetch<AnalyticsSummary>(`/api/admin/analytics/summary?${range}`),
    enabled: valid,
  });
  const series = useQuery({
    queryKey: ["analytics-timeseries", from, to, interval],
    queryFn: () => clientFetch<AnalyticsTimeseries>(`/api/admin/analytics/timeseries?${range}&interval=${interval}`),
    enabled: valid,
  });
  const products = useQuery({
    queryKey: ["analytics-products", from, to],
    queryFn: () => clientFetch<AnalyticsProducts>(`/api/admin/analytics/products?${range}`),
    enabled: valid,
  });
  const funnel = useQuery({
    queryKey: ["analytics-funnel", from, to],
    queryFn: () => clientFetch<AnalyticsFunnel>(`/api/admin/analytics/funnel?${range}`),
    enabled: valid,
  });
  const demand = useQuery({
    queryKey: ["analytics-demand", from, to],
    queryFn: () => clientFetch<AnalyticsDemand>(`/api/admin/analytics/demand?${range}`),
    enabled: valid,
  });

  const firstError = [summary, series, products, funnel, demand].find((q) => q.isError)?.error;

  return (
    <div className="space-y-6">
      {/* Filters: one row above everything they control. */}
      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Date range" className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                if (p.key === "custom") setCustom([from, to]);
                setPreset(p.key);
              }}
              aria-pressed={preset === p.key}
              className={cn(
                "min-h-9 rounded-xl px-3 text-sm font-semibold transition-colors",
                preset === p.key ? "bg-deep text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="analytics-from">From</Label>
              <Input id="analytics-from" type="date" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="analytics-to">To</Label>
              <Input id="analytics-to" type="date" value={custom[1]} min={custom[0]} max={today} onChange={(e) => setCustom([custom[0], e.target.value])} />
            </div>
          </div>
        ) : null}
        <p className="pb-2 text-sm text-muted-foreground">
          {valid ? `${longDate(from)} – ${longDate(to)} · ${days} day${days === 1 ? "" : "s"}` : null}
        </p>
      </div>
      {!valid ? (
        <p className="text-sm text-destructive" role="alert">
          Pick a start date on or before the end date, at most 366 days apart.
        </p>
      ) : null}

      <p className="flex items-start gap-2 rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
        <span>
          <strong className="text-foreground">Verified:</strong> every figure on this page comes from Park Vega&apos;s own
          records: payments the payment provider confirmed, refunds staff completed, tickets scanned at the gate. Money is
          counted on the day it was paid (West Africa Time). Website visits and ad results are tracked separately in
          Google Analytics, below.
        </span>
      </p>

      {firstError ? <LoadError error={firstError} /> : null}

      <KpiGrid summary={summary.data} loading={summary.isPending && valid} />

      <RevenueOverTime
        data={series.data}
        loading={series.isPending && valid}
        interval={interval}
        intervalChoice={intervalChoice}
        onIntervalChange={setIntervalChoice}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking funnel</CardTitle>
            <CardDescription>What became of the bookings started in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {funnel.data ? (
              funnel.data.steps[0]?.count ? (
                <BarList
                  rows={funnel.data.steps.map((s) => ({ key: s.key, label: s.label, value: s.count }))}
                  note={(row, i) => (i === 0 ? null : percent(row.value / funnel.data!.steps[0].count))}
                />
              ) : (
                <Empty>No bookings were started in this period.</Empty>
              )
            ) : (
              <Loading />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How far ahead people book</CardTitle>
            <CardDescription>Days between paying and the visit, for bookings paid in this period.</CardDescription>
          </CardHeader>
          <CardContent>
            {demand.data ? (
              demand.data.leadTime.some((b) => b.bookings > 0) ? (
                <BarList rows={demand.data.leadTime.map((b) => ({ key: b.bucket, label: b.bucket, value: b.bookings }))} />
              ) : (
                <Empty>No bookings were paid in this period.</Empty>
              )
            ) : (
              <Loading />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Busiest visit days</CardTitle>
            <CardDescription>Guests on paid bookings whose visit falls in this period, by weekday.</CardDescription>
          </CardHeader>
          <CardContent>
            {demand.data ? (
              demand.data.byWeekday.some((d) => d.guests > 0) ? (
                <BarList
                  rows={demand.data.byWeekday.map((d) => ({ key: d.weekday, label: d.weekday, value: d.guests, detail: `${d.bookings} bookings` }))}
                  note={(row, i) => `${demand.data!.byWeekday[i].bookings} bkg`}
                />
              ) : (
                <Empty>No paid visits fall in this period.</Empty>
              )
            ) : (
              <Loading />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next 14 days</CardTitle>
            <CardDescription>Paid guests expected, from today. Not affected by the date range.</CardDescription>
          </CardHeader>
          <CardContent>
            {demand.data ? (
              demand.data.upcoming.length ? (
                <BarList
                  rows={demand.data.upcoming.map((d) => ({ key: d.date, label: `${weekdayShort(d.date)} ${shortDate(d.date)}`, value: d.guests }))}
                  note={(row, i) => `${demand.data!.upcoming[i].bookings} bkg`}
                />
              ) : (
                <Empty>No paid bookings for the next 14 days yet.</Empty>
              )
            ) : (
              <Loading />
            )}
          </CardContent>
        </Card>
      </div>

      <AttributionCard from={from} to={to} enabled={valid} />

      <Card>
        <CardHeader>
          <CardTitle>Tickets by product</CardTitle>
          <CardDescription>Bookings paid in this period. Revenue is after group discounts, before refunds.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Adults</TableHead>
                <TableHead className="text-right">Children</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data?.rows.length ? (
                products.data.rows.map((row) => (
                  <TableRow key={`${row.kind}-${row.productId ?? row.name}`}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.kind === "event" ? <span className="ml-2 text-xs text-muted-foreground">Event</span> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.adultTickets)}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.childTickets)}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.bookings)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNaira(row.revenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {products.isPending && valid ? "Loading…" : "No paid bookings in this period."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <EnquiriesCard summary={summary.data} />
        <TrackedCard />
      </div>

      <ExportCard from={from} to={to} interval={interval} disabled={!valid} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function weekdayShort(date: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function Loading() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Delta({ current, previous, days }: { current: number; previous: number; days: number }) {
  if (previous === 0) {
    return <span className="text-xs text-muted-foreground">{current === 0 ? "No change" : "None in the previous period"}</span>;
  }
  const change = (current - previous) / Math.abs(previous);
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="font-semibold text-foreground">
        {up ? "+" : "−"}
        {Math.abs(Math.round(change * 100))}%
      </span>
      <span>vs previous {days} days</span>
    </span>
  );
}

function KpiGrid({ summary, loading }: { summary?: AnalyticsSummary; loading: boolean }) {
  const days = summary ? daysIn(summary.previous.from, summary.previous.to) : 0;
  const tile = (
    key: keyof AnalyticsFigures,
    label: string,
    value: (f: AnalyticsFigures) => string,
    detail: (f: AnalyticsFigures) => string,
    compare = true,
  ) => (
    <Card key={key}>
      <CardContent className="space-y-1.5 p-5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="font-display text-3xl font-bold tracking-tight text-deep tabular-nums">
          {summary ? value(summary.current) : loading ? "…" : "–"}
        </p>
        {summary ? <p className="text-xs text-muted-foreground">{detail(summary.current)}</p> : null}
        {summary && compare ? (
          <Delta current={Number(summary.current[key])} previous={Number(summary.prior[key])} days={days} />
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tile(
        "netRevenue",
        "Net ticket revenue",
        (f) => formatNaira(f.netRevenue),
        (f) => `${formatNaira(f.grossRevenue)} paid − ${formatNaira(f.refunds)} refunded`,
      )}
      {tile("paidBookings", "Paid bookings", (f) => count(f.paidBookings), (f) => `Average ${formatNaira(f.averageOrderValue)} per booking`)}
      {tile("ticketsSold", "Tickets sold", (f) => count(f.ticketsSold), (f) => `${count(f.adultTickets)} adult · ${count(f.childTickets)} child`)}
      {tile(
        "bookingConversionRate",
        "Bookings completed",
        (f) => percent(f.bookingConversionRate),
        (f) => `${count(f.bookingsPaidOfCreated)} of ${count(f.bookingsCreated)} started bookings were paid`,
        false,
      )}
      {tile("admissions", "Gate admissions", (f) => count(f.admissions), () => "Tickets scanned at the gate")}
      {tile("refunds", "Refunds", (f) => formatNaira(f.refunds), (f) => `${count(f.refundCount)} completed`, false)}
      {tile("foodRevenue", "Online food orders", (f) => formatNaira(f.foodRevenue), (f) => `${count(f.foodOrders)} paid online`)}
      {tile("enquiries", "Group enquiries", (f) => count(f.enquiries), () => "Birthday, school and corporate")}
    </div>
  );
}

type Measure = "netRevenue" | "paidBookings" | "ticketsSold";

const MEASURES: { key: Measure; label: string; money: boolean }[] = [
  { key: "netRevenue", label: "Net revenue", money: true },
  { key: "paidBookings", label: "Paid bookings", money: false },
  { key: "ticketsSold", label: "Tickets sold", money: false },
];

function RevenueOverTime({
  data,
  loading,
  interval,
  intervalChoice,
  onIntervalChange,
}: {
  data?: AnalyticsTimeseries;
  loading: boolean;
  interval: AnalyticsInterval;
  intervalChoice: AnalyticsInterval | "auto";
  onIntervalChange: (value: AnalyticsInterval | "auto") => void;
}) {
  const [measure, setMeasure] = React.useState<Measure>("netRevenue");
  const def = MEASURES.find((m) => m.key === measure)!;
  const points =
    data?.points.map((p) => ({ key: p.period, label: periodLabel(p.period, interval), value: p[measure] })) ?? [];
  const total = points.reduce((sum, p) => sum + p.value, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{def.label} over time</CardTitle>
          <CardDescription>
            {data ? `${def.money ? formatNaira(total) : count(total)} in this period, by ${interval}.` : "By day, week or month."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Measure" className="flex gap-1 rounded-xl border border-border p-1">
            {MEASURES.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={measure === m.key}
                onClick={() => setMeasure(m.key)}
                className={cn(
                  "min-h-8 rounded-lg px-2.5 text-xs font-semibold",
                  measure === m.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="analytics-interval">
            Group by
          </label>
          <select
            id="analytics-interval"
            value={intervalChoice}
            onChange={(e) => onIntervalChange(e.target.value as AnalyticsInterval | "auto")}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="auto">Auto ({interval})</option>
            <option value="day">By day</option>
            <option value="week">By week</option>
            <option value="month">By month</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {data ? (
          <>
            <TimeChart
              points={points}
              format={(v) => (def.money ? formatNaira(v) : count(v))}
              axisFormat={(v) => (def.money ? compactNaira(v) : count(Math.round(v)))}
              ariaLabel={`${def.label} by ${interval}, ${data.from} to ${data.to}`}
            />
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold text-primary-ink">Show as a table</summary>
              <div className="mt-3 max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Refunded</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.points.map((p) => (
                      <TableRow key={p.period}>
                        <TableCell>{periodLabel(p.period, interval)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNaira(p.grossRevenue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNaira(p.refunds)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNaira(p.netRevenue)}</TableCell>
                        <TableCell className="text-right tabular-nums">{count(p.paidBookings)}</TableCell>
                        <TableCell className="text-right tabular-nums">{count(p.ticketsSold)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </>
        ) : loading ? (
          <Loading />
        ) : null}
      </CardContent>
    </Card>
  );
}

const GROUPS: { key: AttributionGroup; label: string; heading: string }[] = [
  { key: "channel", label: "Channel", heading: "Channel" },
  { key: "source_medium", label: "Source / medium", heading: "Source / medium" },
  { key: "campaign", label: "Campaign", heading: "Campaign" },
];

/**
 * Paid bookings and enquiries by marketing channel. The money is verified;
 * which channel earned it is an estimate, so the card says so and shows how
 * much of the total it can explain.
 */
function AttributionCard({ from, to, enabled }: { from: string; to: string; enabled: boolean }) {
  const [model, setModel] = React.useState<AttributionModel>("last");
  const [groupBy, setGroupBy] = React.useState<AttributionGroup>("channel");
  const report = useQuery({
    queryKey: ["analytics-attribution", from, to, model, groupBy],
    queryFn: () =>
      clientFetch<AnalyticsAttribution>(
        `/api/admin/analytics/attribution?from=${from}&to=${to}&model=${model}&groupBy=${groupBy}`,
      ),
    enabled,
  });
  const data = report.data;
  const heading = GROUPS.find((g) => g.key === groupBy)!.heading;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="max-w-2xl space-y-1.5">
          <CardTitle className="flex flex-wrap items-center gap-2">
            Where bookings come from
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              <Compass className="size-3.5" aria-hidden="true" /> Estimate
            </span>
          </CardTitle>
          <CardDescription>
            Paid bookings (verified money) and enquiries, credited to the {model === "last" ? "last" : "first"} campaign,
            ad or website that brought the visitor. Only visitors who allowed analytics cookies can be traced; the rest
            are shown as &ldquo;Not tracked&rdquo;, never guessed.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Credit to" className="flex gap-1 rounded-xl border border-border p-1">
            {(["last", "first"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={model === m}
                onClick={() => setModel(m)}
                className={cn(
                  "min-h-8 rounded-lg px-2.5 text-xs font-semibold",
                  model === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "last" ? "Last touch" : "First touch"}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="attribution-group">
            Group by
          </label>
          <select
            id="attribution-group"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as AttributionGroup)}
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                By {g.label.toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.isError ? <LoadError error={report.error} /> : null}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{heading}</TableHead>
                <TableHead className="text-right">Paid bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Share of revenue</TableHead>
                <TableHead className="text-right">Enquiries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.length ? (
                data.rows.map((row) => (
                  <TableRow key={row.key} className={row.tracked ? undefined : "text-muted-foreground"}>
                    <TableCell className={cn("font-medium", !row.tracked && "italic")}>{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.bookings)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNaira(row.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data.totals.revenue > 0 ? percent(row.revenue / data.totals.revenue) : "–"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.leads)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {report.isPending && enabled ? "Loading…" : "No paid bookings or enquiries in this period."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data && data.totals.bookings > 0 ? (
          <p className="text-xs text-muted-foreground">
            Tracking data covers {percent(data.totals.trackedBookingShare)} of paid bookings (
            {percent(data.totals.trackedRevenueShare)} of revenue) in this period.
            {model === "first" ? " First touch is the earliest visit we know of in the last 90 days." : " Last touch is the latest campaign, ad or website visit in the last 30 days; plain return visits don't replace it."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const ENQUIRY_LABELS: Record<string, string> = {
  birthday: "Birthday parties",
  school: "School excursions",
  corporate: "Corporate days",
};

function EnquiriesCard({ summary }: { summary?: AnalyticsSummary }) {
  const byType = summary?.current.enquiriesByType ?? {};
  const rows = Object.keys(ENQUIRY_LABELS).map((type) => ({ key: type, label: ENQUIRY_LABELS[type], value: byType[type] ?? 0 }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group enquiries</CardTitle>
        <CardDescription>Enquiry forms received in this period, by type.</CardDescription>
      </CardHeader>
      <CardContent>
        {summary ? rows.some((r) => r.value > 0) ? <BarList rows={rows} /> : <Empty>No enquiries in this period.</Empty> : <Loading />}
      </CardContent>
    </Card>
  );
}

const TRACKED_LINKS = [
  { label: "Google Analytics", detail: "Visits, traffic sources, website funnel", href: "https://analytics.google.com/" },
  { label: "Search Console", detail: "Google searches that show the site", href: "https://search.google.com/search-console" },
  { label: "Microsoft Clarity", detail: "Heatmaps and session recordings", href: "https://clarity.microsoft.com/" },
];

function TrackedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Website traffic (tracked)</CardTitle>
        <CardDescription>
          Visits and clicks are measured only for visitors who accept analytics cookies, so they undercount real traffic.
          They live in these tools rather than here, so they are never mixed with the verified figures above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {TRACKED_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-primary"
              >
                <span>
                  <span className="font-semibold text-foreground">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.detail}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const EXPORTS: { report: AnalyticsExportReport; label: string; detail: string }[] = [
  { report: "timeseries", label: "Revenue by period", detail: "Paid, refunded, net, bookings, tickets" },
  { report: "products", label: "Tickets by product", detail: "Adults, children, bookings, revenue" },
  { report: "bookings", label: "Paid bookings", detail: "Code, paid at, visit date, amount (no contact details)" },
  { report: "enquiries", label: "Group enquiries", detail: "Received, type, date, group size, status" },
  { report: "attribution", label: "Bookings by channel", detail: "Last-touch channel estimate: bookings, revenue, enquiries" },
];

function ExportCard({ from, to, interval, disabled }: { from: string; to: string; interval: AnalyticsInterval; disabled: boolean }) {
  const [busy, setBusy] = React.useState<AnalyticsExportReport | null>(null);
  const [error, setError] = React.useState<unknown>(null);

  async function download(report: AnalyticsExportReport) {
    setBusy(report);
    setError(null);
    try {
      const file = await clientFetch<{ filename: string; csv: string }>(
        `/api/admin/analytics/export?report=${report}&from=${from}&to=${to}&interval=${interval}`,
      );
      const url = URL.createObjectURL(new Blob([file.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download (CSV)</CardTitle>
        <CardDescription>
          For the dates above ({longDate(from)} – {longDate(to)}). Opens in Excel or Google Sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EXPORTS.map((item) => (
            <Button
              key={item.report}
              type="button"
              variant="outline"
              disabled={disabled || busy !== null}
              onClick={() => void download(item.report)}
              className="h-auto flex-col items-start gap-1 whitespace-normal p-4 text-left"
            >
              <span className="flex items-center gap-2 font-semibold">
                {busy === item.report ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                {item.label}
              </span>
              <span className="text-xs font-normal text-muted-foreground">{item.detail}</span>
            </Button>
          ))}
        </div>
        {error ? <LoadError error={error} /> : null}
      </CardContent>
    </Card>
  );
}
