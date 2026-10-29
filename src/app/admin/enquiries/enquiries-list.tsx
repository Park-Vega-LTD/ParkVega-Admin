"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientFetch } from "@/lib/api.client";
import type { Enquiry } from "@/lib/admin-types";

type Filter = "all" | Enquiry["type"];

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(
    new Date(iso),
  );
}

/** What the group asked for, in one line. */
function summary(enquiry: Enquiry) {
  if (enquiry.type === "birthday") {
    return [enquiry.package, enquiry.guests != null ? `${enquiry.guests} guests` : null].filter(Boolean).join(" · ");
  }
  return [
    enquiry.organisation,
    enquiry.pupils != null ? `${enquiry.pupils} pupils` : null,
    enquiry.staff != null ? `${enquiry.staff} staff` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function EnquiriesList() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const enquiries = useQuery({
    queryKey: ["admin-enquiries", filter],
    queryFn: () => clientFetch<Enquiry[]>(filter === "all" ? "/api/enquiries" : `/api/enquiries?type=${filter}`),
  });

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="birthday">Birthday parties</TabsTrigger>
          <TabsTrigger value="school">School excursions</TabsTrigger>
        </TabsList>
      </Tabs>

      {enquiries.isError ? <LoadError error={enquiries.error} /> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date wanted</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : (enquiries.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">No enquiries yet.</TableCell>
              </TableRow>
            ) : (
              (enquiries.data ?? []).map((enquiry) => (
                <TableRow key={enquiry.id} className="align-top">
                  <TableCell className="whitespace-nowrap">{formatDateTime(enquiry.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{enquiry.type === "birthday" ? "Birthday" : "School"}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{enquiry.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{enquiry.date}</TableCell>
                  <TableCell className="max-w-xs">
                    <div>{summary(enquiry) || "–"}</div>
                    {enquiry.notes ? <div className="mt-1 text-xs text-muted-foreground">{enquiry.notes}</div> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <a
                      href={`https://wa.me/${enquiry.whatsapp.replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-ink underline-offset-4 hover:underline"
                    >
                      {enquiry.whatsapp}
                    </a>
                    {enquiry.email ? (
                      <div>
                        <a href={`mailto:${enquiry.email}`} className="text-xs text-muted-foreground hover:underline">
                          {enquiry.email}
                        </a>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
