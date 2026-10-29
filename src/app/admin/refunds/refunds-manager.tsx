"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientFetch } from "@/lib/api.client";
import type { RefundRequest, RefundStatus } from "@/lib/admin-types";
import { formatNaira } from "@/lib/utils";

const FILTERS: { value: RefundStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Waiting" },
  { value: "COMPLETED", label: "Refunded" },
  { value: "FAILED", label: "Failed" },
  { value: "ALL", label: "All" },
];

const STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: "Waiting for approval",
  COMPLETED: "Refunded",
  FAILED: "Failed",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(iso));
}

export function RefundsManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<RefundStatus | "ALL">("PENDING");
  const [approving, setApproving] = React.useState<RefundRequest | null>(null);

  const refunds = useQuery({
    queryKey: ["admin-refunds", filter],
    queryFn: () => clientFetch<RefundRequest[]>(filter === "ALL" ? "/api/refunds" : `/api/refunds?status=${filter}`),
  });

  const approve = useMutation({
    mutationFn: (refund: RefundRequest) => clientFetch(`/api/refunds/${refund.id}/approve`, { method: "POST" }),
    onSuccess: (_data, refund) => {
      toast.success(`Refunded ${formatNaira(refund.amount)} for booking ${refund.booking_code ?? ""}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
    },
    // A provider failure leaves the request waiting, so it can be retried.
    onError: (error) => toast.error(error.message),
    onSettled: () => setApproving(null),
  });

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as RefundStatus | "ALL")}>
        <TabsList>
          {FILTERS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {refunds.isError ? <LoadError error={refunds.error} /> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Visit date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.isPending ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : (refunds.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">No refund requests here.</TableCell>
              </TableRow>
            ) : (
              (refunds.data ?? []).map((refund) => (
                <TableRow key={refund.id}>
                  <TableCell>{formatDate(refund.created_at)}</TableCell>
                  <TableCell className="font-mono text-sm">{refund.booking_code ?? "–"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{refund.full_name ?? "–"}</div>
                    {refund.requested_by_email ? (
                      <div className="text-xs text-muted-foreground">{refund.requested_by_email}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{refund.visit_date ?? "–"}</TableCell>
                  <TableCell className="text-right">{formatNaira(refund.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={refund.status === "FAILED" ? "destructive" : refund.status === "COMPLETED" ? "secondary" : "outline"}>
                      {STATUS_LABELS[refund.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {refund.status === "PENDING" ? (
                      <Button size="sm" onClick={() => setApproving(refund)}>
                        Approve
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={approving !== null} onOpenChange={(open) => !open && setApproving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Refund {approving ? formatNaira(approving.amount) : ""} to {approving?.full_name ?? "the guest"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The money goes back through the payment provider to the card or account that paid, and every ticket on
              booking {approving?.booking_code ?? ""} is cancelled. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (approving) approve.mutate(approving);
              }}
              disabled={approve.isPending}
            >
              {approve.isPending ? "Refunding…" : "Approve refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
