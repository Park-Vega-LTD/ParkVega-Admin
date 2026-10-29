"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, PenLine, Plus } from "lucide-react";

import { EventDialog } from "@/components/parkvega/admin/event-dialog";
import { EventCalendar } from "@/components/parkvega/event-calendar";
import { clientFetch } from "@/lib/api.client";
import { categoryOf } from "@/lib/events";
import type { Event } from "@/types/api";
import {
  AdminTable,
  type AdminColumn,
  type AdminMutationConfig,
} from "@/components/parkvega/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EVENTS_KEY = ["events"] as const;

/** A table row is an `Event` (already satisfies `AdminTableRow` via `id`). */
type EventRow = Event;

/* -------------------------------------------------------------------------- */
/*  Add-session form                                                           */
/* -------------------------------------------------------------------------- */

const addSessionSchema = z.object({
  eventId: z.string().min(1, "Select an event"),
  session_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  capacity: z.coerce
    .number({ invalid_type_error: "Capacity must be a number" })
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity is too large"),
});

type AddSessionValues = z.input<typeof addSessionSchema>;
type AddSessionParsed = z.output<typeof addSessionSchema>;

function AddSessionDialog({ events }: { events: Event[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const activeEvents = events.filter((event) => event.status !== "CANCELLED");

  const form = useForm<AddSessionValues>({
    resolver: zodResolver(addSessionSchema),
    defaultValues: {
      eventId: "",
      session_date: "",
      start_time: "",
      capacity: 50,
    },
  });

  const mutation = useMutation<EventSessionResponse, Error, AddSessionParsed>({
    mutationFn: ({ eventId, ...payload }) =>
      clientFetch<EventSessionResponse>(`/api/events/${eventId}/sessions`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY });
      toast.success("Session added.");
      form.reset({
        eventId: "",
        session_date: "",
        start_time: "",
        capacity: 50,
      });
      setOpen(false);
    },
  });

  async function onSubmit(values: AddSessionValues) {
    setFormError(null);
    try {
      await mutation.mutateAsync(values as AddSessionParsed);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  const isBusy = form.formState.isSubmitting || mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFormError(null);
          form.reset({
            eventId: "",
            session_date: "",
            start_time: "",
            capacity: 50,
          });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={activeEvents.length === 0}>
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add session</DialogTitle>
          <DialogDescription>
            Schedule a new session for an existing event.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="session_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={isBusy}>
                {isBusy ? "Adding\u2026" : "Add session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** The REST API returns the created session; its exact shape is unused here. */
type EventSessionResponse = unknown;

/* -------------------------------------------------------------------------- */
/*  Status badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: Event["status"] }) {
  const variant =
    status === "PUBLISHED"
      ? "default"
      : status === "CANCELLED"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

/* -------------------------------------------------------------------------- */
/*  Manager                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Admin events manager (design Sections 9 & 11, Requirement 11.3).
 *
 * Renders the generic {@link AdminTable} with the server-fetched events plus
 * create-event and add-session controls. All mutations go through
 * `clientFetch` to the BFF data proxy (`/api/...`) and invalidate `['events']`
 * on success:
 *
 *  - Create event: `POST /api/events`
 *  - Add session: `POST /api/events/:id/sessions`
 *  - Cancel event + future sessions: `PATCH /api/events/:id/cancel` — routed
 *    through the table's optimistic mutation pipeline so the row flips to
 *    `CANCELLED` immediately and rolls back on failure.
 *
 * Validates: Requirements 11.3
 */
export function AdminEventsManager({ events, extraOpenDates }: { events: Event[]; extraOpenDates?: string[] }) {
  const [editing, setEditing] = React.useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const openEditor = React.useCallback((event: Event | null) => {
    setEditing(event);
    setDialogOpen(true);
  }, []);

  // Cancelling an event flips its status to CANCELLED. This is the single
  // mutation the AdminTable drives for interactive cells.
  const cancelMutation: AdminMutationConfig<EventRow> = React.useMemo(
    () => ({
      path: ({ row }) => `/api/events/${row.id}/cancel`,
      method: "PATCH",
      invalidateKeys: [EVENTS_KEY],
    }),
    [],
  );

  const columns: AdminColumn<EventRow>[] = React.useMemo(
    () => [
      {
        id: "title",
        header: "Event",
        cell: (row) => (
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            {row.description ? (
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {row.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "category",
        header: "Type",
        cell: (row) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${categoryOf(row).className}`}>
            {categoryOf(row).label}
          </span>
        ),
      },
      {
        id: "sessions",
        header: "Sessions",
        cell: (row) => (
          <span className="tabular-nums">{row.sessions?.length ?? 0}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "actions",
        header: <span className="sr-only">Actions</span>,
        className: "text-right",
        cell: (row, mutate) => {
          const isCancelled = row.status === "CANCELLED";
          return (
            <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={isCancelled} onClick={() => openEditor(row)}>
              <PenLine className="size-4" aria-hidden="true" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isCancelled}
              className="border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
              onClick={() =>
                mutate({
                  row,
                  apply: (current) => ({ ...current, status: "CANCELLED" }),
                  successMessage: "Event cancelled.",
                  errorMessage: "Could not cancel event.",
                })
              }
            >
              {isCancelled ? "Cancelled" : "Cancel"}
            </Button>
            </div>
          );
        },
      },
    ],
    [openEditor],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AddSessionDialog events={events} />
        <Button onClick={() => openEditor(null)}>
          <Plus className="size-4" aria-hidden="true" />
          Create event
        </Button>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-4">
          <EventCalendar events={events} extraOpenDates={extraOpenDates} onSelect={openEditor} showDrafts />
          <p className="mt-2 text-xs text-muted-foreground">Dashed entries are drafts. Click an entry to edit it.</p>
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <AdminTable<EventRow>
            columns={columns}
            data={events}
            onMutate={cancelMutation}
            emptyMessage="No events yet. Create your first event to get started."
          />
        </TabsContent>
      </Tabs>

      <EventDialog event={editing} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
