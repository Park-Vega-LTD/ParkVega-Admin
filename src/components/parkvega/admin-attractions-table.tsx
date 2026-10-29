"use client";

import * as React from "react";
import { PenLine, Plus } from "lucide-react";

import { AttractionDialog } from "@/components/parkvega/admin/attraction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { missingFields } from "@/lib/attractions";
import {
  AdminTable,
  type AdminColumn,
  type AdminMutationConfig,
} from "@/components/parkvega/admin-table";
import type { Attraction } from "@/types/api";

/**
 * Client wrapper that renders the shared {@link AdminTable} for the admin
 * attractions page. Receives the full attraction list (ACTIVE and INACTIVE)
 * fetched server-side and wires the status toggle to a BFF data-proxy mutation.
 *
 * Toggle mutation: `PATCH /api/attractions/:id/status` with an optimistic
 * status flip and `['attractions']` invalidation on success (Requirement 11.2).
 */
export function AdminAttractionsTable({
  attractions,
}: {
  attractions: Attraction[];
}) {
  const [editing, setEditing] = React.useState<Attraction | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const openEditor = (attraction: Attraction | null) => {
    setEditing(attraction);
    setDialogOpen(true);
  };

  const columns: AdminColumn<Attraction>[] = [
    {
      id: "name",
      header: "Name",
      className: "font-medium",
      cell: (row) => {
        const missing = missingFields(row);
        return (
          <div>
            <p>{row.name}</p>
            {missing.length > 0 && (
              <p className="text-xs font-normal text-destructive" title={`Missing: ${missing.join(", ")}`}>
                Missing: {missing.join(", ")}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => row.category,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
          {row.status === "ACTIVE" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "toggle",
      header: "Active",
      className: "w-24",
      cell: (row, mutate) => {
        const isActive = row.status === "ACTIVE";
        const nextStatus: Attraction["status"] = isActive
          ? "INACTIVE"
          : "ACTIVE";
        return (
          <Switch
            checked={isActive}
            aria-label={`Toggle ${row.name} ${isActive ? "inactive" : "active"}`}
            onCheckedChange={() =>
              mutate({
                row,
                apply: (current) => ({ ...current, status: nextStatus }),
                successMessage: `${row.name} is now ${
                  nextStatus === "ACTIVE" ? "active" : "inactive"
                }.`,
                errorMessage: `Could not update ${row.name}.`,
              })
            }
          />
        );
      },
    },
    {
      id: "edit",
      header: <span className="sr-only">Edit</span>,
      className: "w-24 text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => openEditor(row)}>
          <PenLine className="size-4" /> Edit
        </Button>
      ),
    },
  ];

  const mutationConfig: AdminMutationConfig<Attraction> = {
    path: ({ row }) => `/api/attractions/${row.id}/status`,
    method: "PATCH",
    body: ({ apply, row }) => ({ status: apply(row).status }),
    invalidateKeys: [["attractions"]],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openEditor(null)}>
          <Plus className="size-4" /> Add attraction
        </Button>
      </div>
      <AdminTable
        columns={columns}
        data={attractions}
        onMutate={mutationConfig}
        emptyMessage="No attractions found."
      />
      <AttractionDialog attraction={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
