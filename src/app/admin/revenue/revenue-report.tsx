"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientFetch } from "@/lib/api.client";
import { todayWat, type RevenueReport } from "@/lib/admin-types";
import { formatNaira } from "@/lib/utils";

/**
 * The API counts bookings with `created_at` between `from` and `to`, so the
 * picked dates are sent as whole days in West Africa Time.
 */
function rangeQuery(from: string, to: string) {
  const params = new URLSearchParams({
    from: `${from}T00:00:00.000+01:00`,
    to: `${to}T23:59:59.999+01:00`,
  });
  return params.toString();
}

export function RevenueReportView() {
  const today = todayWat();
  const [from, setFrom] = React.useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = React.useState(today);
  const valid = Boolean(from && to && from <= to);

  const report = useQuery({
    queryKey: ["admin-revenue", from, to],
    queryFn: () => clientFetch<RevenueReport>(`/api/admin/revenue?${rangeQuery(from, to)}`),
    enabled: valid,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="revenue-from">From</Label>
          <Input id="revenue-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="revenue-to">To</Label>
          <Input id="revenue-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        {!valid ? <p className="pb-3 text-sm text-destructive">Pick a start date on or before the end date.</p> : null}
      </div>

      {report.isError ? <LoadError error={report.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-bold tracking-tight">
              {report.data ? formatNaira(Number(report.data.totalRevenue)) : "–"}
            </p>
            <CardDescription>Paid bookings created in this period</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-bold tracking-tight">{report.data?.totalBookings ?? "–"}</p>
            <CardDescription>Paid, confirmed or completed</CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Tickets sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.isPending && valid ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : report.data && report.data.breakdown.length > 0 ? (
              report.data.breakdown.map((row) => (
                <TableRow key={row.ticketProductId ?? row.productName}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell className="text-right">{row.quantitySold}</TableCell>
                  <TableCell className="text-right">{formatNaira(Number(row.revenueSubtotal))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">No paid bookings in this period.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
