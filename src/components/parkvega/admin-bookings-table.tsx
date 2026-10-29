"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminTable,
  type AdminColumn,
  type AdminMutationConfig,
} from "@/components/parkvega/admin-table";
import { formatNaira } from "@/lib/utils";
import type { Booking } from "@/types/api";

/**
 * Human-readable label + badge styling for each booking status.
 * Keeps the status presentation consistent between the table column and the
 * detail modal.
 */
const STATUS_META: Record<
  Booking["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  reserved: { label: "Reserved", variant: "outline" },
  pending_payment: { label: "Pending payment", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  checked_in: { label: "Checked in", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

function StatusBadge({ status }: { status: Booking["status"] }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

/**
 * Formats an ISO date (or date-time) string as a short, human-readable date.
 * Falls back to the raw value when the string cannot be parsed.
 */
function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A single label/value row inside the booking detail modal. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-right">{children}</dd>
    </div>
  );
}

/**
 * Client wrapper that renders the shared {@link AdminTable} for the read-only
 * admin bookings page and shows the full booking detail in a modal when an
 * admin opens a row (Requirement 11.7).
 *
 * This view performs no mutations: `AdminTable` requires an `onMutate` config,
 * so a no-op-safe config is supplied (no interactive cell ever calls `mutate`).
 * Each row exposes a "View" action button that opens the shadcn `Dialog`.
 */
export function AdminBookingsTable({ bookings }: { bookings: Booking[] }) {
  const [selected, setSelected] = React.useState<Booking | null>(null);

  const columns: AdminColumn<Booking>[] = [
    {
      id: "code",
      header: "Code",
      className: "font-medium font-mono",
      cell: (row) => row.code,
    },
    {
      id: "visit_date",
      header: "Visit date",
      cell: (row) => formatDate(row.visit_date),
    },
    {
      id: "full_name",
      header: "Full name",
      cell: (row) => row.full_name,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "total",
      header: "Total",
      className: "text-right tabular-nums",
      cell: (row) => formatNaira(row.total),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-20 text-right",
      // Row action button opens the detail modal. It never calls `mutate`, so
      // the table's mutation pipeline stays dormant on this read-only page.
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelected(row)}
        >
          View
        </Button>
      ),
    },
  ];

  // Read-only page: no mutation is performed. `AdminTable` requires an
  // `onMutate` config, so this no-op-safe config is provided. No column wires
  // an interactive control to `mutate`, so this request is never issued.
  const noopMutation: AdminMutationConfig<Booking> = {
    path: ({ row }) => `/api/bookings/${row.id}`,
    method: "PATCH",
    invalidateKeys: [["bookings"]],
  };

  return (
    <>
      <AdminTable
        columns={columns}
        data={bookings}
        onMutate={noopMutation}
        emptyMessage="No bookings found."
      />

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{selected.code}</DialogTitle>
                <DialogDescription>
                  Booking placed {formatDateTime(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <dl className="mt-2">
                <DetailRow label="Status">
                  <StatusBadge status={selected.status} />
                </DetailRow>
                <DetailRow label="Visit date">
                  {formatDate(selected.visit_date)}
                </DetailRow>
                <DetailRow label="Guest name">{selected.full_name}</DetailRow>
                <DetailRow label="Email">{selected.email}</DetailRow>
                <DetailRow label="Phone">{selected.phone ?? "—"}</DetailRow>
                <DetailRow label="Ticket">
                  {selected.ticket_name ?? "—"}
                </DetailRow>
                <DetailRow label="Adults">{selected.adults}</DetailRow>
                <DetailRow label="Children">{selected.children}</DetailRow>
                <DetailRow label="Unit price">
                  {formatNaira(selected.unit_price)}
                </DetailRow>
                <DetailRow label="Total">{formatNaira(selected.total)}</DetailRow>
                <DetailRow label="Created">
                  {formatDateTime(selected.created_at)}
                </DetailRow>
              </dl>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
