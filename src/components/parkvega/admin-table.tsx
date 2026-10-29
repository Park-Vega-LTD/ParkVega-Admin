"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { clientFetch } from "@/lib/api.client";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Minimal shape every admin row must satisfy: a stable string `id` used for
 * React keys, row selection, and matching rows during optimistic updates.
 */
export interface AdminTableRow {
  id: string;
}

/**
 * Describes a single column rendered by {@link AdminTable}.
 *
 * `cell` receives the whole row plus a `mutate` callback the column can wire to
 * status toggles, switches, or action buttons so that any interactive control
 * routes its change through the table's optimistic mutation pipeline.
 */
export interface AdminColumn<TData extends AdminTableRow> {
  /** Stable key for the column (also used as the React key). */
  id: string;
  /** Column header label. */
  header: React.ReactNode;
  /**
   * Renders the cell contents for a given row. Receives `mutate` so a column
   * (e.g. a status toggle or a row action) can trigger an optimistic mutation.
   */
  cell: (row: TData, mutate: (variables: AdminMutationVariables<TData>) => void) => React.ReactNode;
  /** Optional className applied to the cell / header. */
  className?: string;
}

/**
 * Variables passed to {@link AdminTable}'s mutation. `apply` describes how the
 * affected row changes locally so the table can optimistically update the row
 * before the network request resolves and roll it back on failure.
 */
export interface AdminMutationVariables<TData extends AdminTableRow> {
  /** The row the mutation targets. */
  row: TData;
  /**
   * Produces the optimistically-updated row from the current row. The returned
   * value is shown immediately and reverted if the request fails.
   */
  apply: (current: TData) => TData;
  /** Optional human-readable success toast message. */
  successMessage?: string;
  /** Optional human-readable error toast message (falls back to the error). */
  errorMessage?: string;
}

/**
 * Describes the network request the table performs for a mutation. Callers map
 * a row + apply result to a BFF request so the generic table never needs to
 * know the concrete endpoint shape.
 *
 * All requests go through {@link clientFetch} to the BFF data proxy
 * (`/api/[...path]`) — Client Components never call the REST API directly
 * (Requirement 11.8 / 14.2).
 */
export interface AdminMutationConfig<TData extends AdminTableRow> {
  /** BFF data-proxy path for the mutation, e.g. `/api/attractions/:id/status`. */
  path: (variables: AdminMutationVariables<TData>) => string;
  /** HTTP method forwarded to the BFF. Defaults to `PATCH`. */
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  /** Optional request body builder. */
  body?: (variables: AdminMutationVariables<TData>) => unknown;
  /**
   * Query key(s) to invalidate on success so dependent lists refetch
   * (Requirement 15.3 / design Section 11).
   */
  invalidateKeys: QueryKey[];
}

export interface AdminTableProps<TData extends AdminTableRow> {
  columns: AdminColumn<TData>[];
  data: TData[];
  /** Mutation configuration shared by every interactive control in the table. */
  onMutate: AdminMutationConfig<TData>;
  /** Enables the leading selection checkbox column when provided. */
  onRowSelect?: (selectedIds: string[]) => void;
  /** Optional empty-state message. */
  emptyMessage?: string;
  className?: string;
}

interface MutationContext<TData extends AdminTableRow> {
  previous: TData[];
}

/**
 * Generic admin data table (design Section 12 — `AdminTable`).
 *
 * Reused across `/admin/attractions`, `/admin/events`, `/admin/restaurants`,
 * and `/admin/bookings`. Interactive cells (status toggles, row actions) call
 * the `mutate` callback handed to each column's renderer, which runs a TanStack
 * Query `useMutation` through the BFF data proxy with:
 *
 *  - optimistic update applied immediately (`onMutate`),
 *  - rollback + error toast on failure (`onError`),
 *  - success toast (`onSuccess`),
 *  - query invalidation (`onSettled`).
 *
 * Validates: Requirements 11.8, 15.2, 15.3, 15.5
 */
export function AdminTable<TData extends AdminTableRow>({
  columns,
  data,
  onMutate,
  onRowSelect,
  emptyMessage = "No records to display.",
  className,
}: AdminTableProps<TData>) {
  const queryClient = useQueryClient();

  // Local, optimistic view of the rows. Seeded from `data` and reset whenever
  // the server-provided `data` prop changes (e.g. after invalidation). We reset
  // during render (tracking the last-seen `data` reference) instead of using an
  // effect, which avoids the cascading re-renders an effect+setState causes.
  const [rows, setRows] = React.useState<TData[]>(data);
  const [lastData, setLastData] = React.useState<TData[]>(data);
  if (data !== lastData) {
    setLastData(data);
    setRows(data);
  }

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const mutation = useMutation<
    unknown,
    Error,
    AdminMutationVariables<TData>,
    MutationContext<TData>
  >({
    mutationFn: (variables) =>
      clientFetch(onMutate.path(variables), {
        method: onMutate.method ?? "PATCH",
        ...(onMutate.body
          ? { body: JSON.stringify(onMutate.body(variables)) }
          : {}),
      }),
    onMutate: async (variables) => {
      // Snapshot for rollback, then apply the optimistic change immediately.
      const previous = rows;
      setRows((current) =>
        current.map((row) =>
          row.id === variables.row.id ? variables.apply(row) : row,
        ),
      );
      return { previous };
    },
    onError: (error, variables, context) => {
      // Roll the optimistic update back to the pre-mutation snapshot.
      if (context) {
        setRows(context.previous);
      }
      toast.error(variables.errorMessage ?? error.message);
    },
    onSuccess: (_result, variables) => {
      toast.success(variables.successMessage ?? "Saved.");
    },
    onSettled: () => {
      // Reconcile with the server for every invalidated resource key.
      for (const key of onMutate.invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  const mutate = React.useCallback(
    (variables: AdminMutationVariables<TData>) => mutation.mutate(variables),
    [mutation],
  );

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const emitSelection = React.useCallback(
    (next: Set<string>) => {
      setSelected(next);
      onRowSelect?.([...next]);
    },
    [onRowSelect],
  );

  function toggleAll(checked: boolean) {
    emitSelection(checked ? new Set(rows.map((row) => row.id)) : new Set());
  }

  function toggleRow(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    emitSelection(next);
  }

  const showSelection = Boolean(onRowSelect);
  const columnCount = columns.length + (showSelection ? 1 : 0);

  return (
    <Table className={cn(className)}>
      <TableHeader>
        <TableRow>
          {showSelection ? (
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all rows"
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(value) => toggleAll(value === true)}
              />
            </TableHead>
          ) : null}
          {columns.map((column) => (
            <TableHead key={column.id} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columnCount}
              className="py-8 text-center text-muted-foreground"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const isSelected = selected.has(row.id);
            return (
              <TableRow key={row.id} data-state={isSelected ? "selected" : undefined}>
                {showSelection ? (
                  <TableCell className="w-10">
                    <Checkbox
                      aria-label={`Select row ${row.id}`}
                      checked={isSelected}
                      onCheckedChange={(value) => toggleRow(row.id, value === true)}
                    />
                  </TableCell>
                ) : null}
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row, mutate)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
