"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Search, UserPlus } from "lucide-react";

import { LoadError } from "@/components/parkvega/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clientFetch } from "@/lib/api.client";
import type { AccessRole, StaffInvite, StaffMember } from "@/lib/admin-types";

const STAFF_KEY = ["admin-staff"];

const ROLE_LABELS: Record<AccessRole, string> = {
  user: "Visitor (no console access)",
  staff: "Staff",
  admin: "Admin",
};

function fullName(member: Pick<StaffMember, "first_name" | "last_name">) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ");
}

function RoleSelect({
  value,
  onChange,
  disabled,
  includeUser = true,
  id,
}: {
  value: AccessRole;
  onChange: (role: AccessRole) => void;
  disabled?: boolean;
  includeUser?: boolean;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(role) => onChange(role as AccessRole)} disabled={disabled}>
      <SelectTrigger id={id} className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(includeUser ? (["staff", "admin", "user"] as const) : (["staff", "admin"] as const)).map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StaffManager({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const staff = useQuery({
    queryKey: STAFF_KEY,
    queryFn: () => clientFetch<StaffMember[]>("/api/staff"),
  });
  const [deactivating, setDeactivating] = React.useState<StaffMember | null>(null);
  const [invite, setInvite] = React.useState<{ member: StaffMember; link: StaffInvite } | null>(null);

  const newInvite = useMutation({
    mutationFn: (member: StaffMember) => clientFetch<StaffInvite>(`/api/staff/${member.id}/invite`, { method: "POST" }),
    onSuccess: (link, member) => setInvite({ member, link }),
    onError: (error) => toast.error(error.message),
  });

  const reactivate = useMutation({
    mutationFn: (member: StaffMember) =>
      clientFetch<StaffMember>(`/api/staff/${member.id}/reactivate`, { method: "PATCH" }),
    onSuccess: (member) => {
      toast.success(`${fullName(member)} can sign in again.`);
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
    onError: (error) => toast.error(error.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AccessRole }) =>
      clientFetch<StaffMember>(`/api/staff/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: (member) => {
      toast.success(
        member.role === "user"
          ? `${fullName(member)} no longer has console access.`
          : `${fullName(member)} is now ${ROLE_LABELS[member.role].toLowerCase()}.`,
      );
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
    onError: (error) => toast.error(error.message),
  });

  const deactivate = useMutation({
    mutationFn: (member: StaffMember) => clientFetch(`/api/staff/${member.id}/deactivate`, { method: "PATCH" }),
    onSuccess: (_data, member) => {
      toast.success(`${fullName(member)} is deactivated and signed out within a minute.`);
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setDeactivating(null),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <AddStaffDialog onCreated={(member, link) => setInvite({ member, link })} />
        <PromoteDialog />
      </div>

      {staff.isError ? <LoadError error={staff.error} /> : null}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.isPending ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : (staff.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">No staff accounts yet.</TableCell>
              </TableRow>
            ) : (
              (staff.data ?? []).map((member) => {
                const isSelf = member.id === currentUserId;
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {fullName(member)}
                      {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <RoleSelect
                        value={member.role}
                        disabled={isSelf || !member.is_active || changeRole.isPending}
                        onChange={(role) => changeRole.mutate({ id: member.id, role })}
                      />
                    </TableCell>
                    <TableCell>
                      {!member.is_active ? (
                        <Badge variant="outline">Deactivated</Badge>
                      ) : member.has_password ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Invited, no password yet</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap text-right">
                      {member.is_active && !member.has_password ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={newInvite.isPending}
                          onClick={() => newInvite.mutate(member)}
                        >
                          Invite link
                        </Button>
                      ) : null}
                      {member.is_active && !isSelf ? (
                        <Button variant="ghost" size="sm" onClick={() => setDeactivating(member)}>
                          Deactivate
                        </Button>
                      ) : null}
                      {!member.is_active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={reactivate.isPending}
                          onClick={() => reactivate.mutate(member)}
                        >
                          Reactivate
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        You can&apos;t change your own access, so the console always keeps at least one admin. New staff choose their
        password from a one-time invite link; a new link replaces the old one.
      </p>

      <InviteLinkDialog invite={invite} onClose={() => setInvite(null)} />

      <AlertDialog open={deactivating !== null} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivating ? fullName(deactivating) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              They are signed out of the console and the website within a minute and can&apos;t sign in again
              until you reactivate them here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deactivating) deactivate.mutate(deactivating);
              }}
              disabled={deactivate.isPending}
            >
              {deactivate.isPending ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Creates a new staff account and hands back its one-time invite link. */
function AddStaffDialog({ onCreated }: { onCreated: (member: StaffMember, link: StaffInvite) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ email: "", first_name: "", last_name: "", phone_number: "" });
  const [role, setRole] = React.useState<AccessRole>("staff");

  const create = useMutation({
    mutationFn: () =>
      clientFetch<StaffMember & StaffInvite>("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          ...(form.phone_number.trim() ? { phone_number: form.phone_number.trim() } : {}),
          role,
        }),
      }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      setForm({ email: "", first_name: "", last_name: "", phone_number: "" });
      setRole("staff");
      setOpen(false);
      onCreated(member, { invite_url: member.invite_url, invite_expires_at: member.invite_expires_at });
    },
    onError: (error) => toast.error(error.message),
  });

  const ready = form.email.includes("@") && form.first_name.trim() && form.last_name.trim();

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="size-4" aria-hidden="true" />
        Add staff
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a staff account</DialogTitle>
            <DialogDescription>
              For someone without an account. If they already signed up on the website, use &ldquo;Give an existing
              account access&rdquo; instead.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) create.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-first">First name</Label>
                <Input id="staff-first" maxLength={100} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-last">Last name</Label>
                <Input id="staff-last" maxLength={100} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input id="staff-phone" maxLength={20} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-role">Access</Label>
              <RoleSelect id="staff-role" value={role} onChange={setRole} includeUser={false} />
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ll get a one-time link to send them. They open it to choose a password, then sign in here.
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!ready || create.isPending}>
                {create.isPending ? "Adding…" : "Add staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Finds an existing account by email and gives it staff or admin access. */
function PromoteDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [found, setFound] = React.useState<StaffMember | null | undefined>(undefined);
  const [role, setRole] = React.useState<AccessRole>("staff");

  const lookup = useMutation({
    mutationFn: () => clientFetch<StaffMember[]>(`/api/staff?email=${encodeURIComponent(email.trim())}`),
    onSuccess: (members) => setFound(members[0] ?? null),
    onError: (error) => toast.error(error.message),
  });

  const promote = useMutation({
    mutationFn: (member: StaffMember) =>
      clientFetch<StaffMember>(`/api/staff/${member.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: (member) => {
      toast.success(`${fullName(member)} is now ${ROLE_LABELS[member.role].toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      close();
    },
    onError: (error) => toast.error(error.message),
  });

  function close() {
    setOpen(false);
    setEmail("");
    setFound(undefined);
    setRole("staff");
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Search className="size-4" aria-hidden="true" />
        Give an existing account access
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give an existing account access</DialogTitle>
            <DialogDescription>
              For someone who already has a website account. They sign in here with the same email and password.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (email.includes("@")) lookup.mutate();
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="promote-email">Their email</Label>
              <Input
                id="promote-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFound(undefined);
                }}
              />
            </div>
            <Button type="submit" variant="outline" disabled={!email.includes("@") || lookup.isPending}>
              {lookup.isPending ? "Finding…" : "Find"}
            </Button>
          </form>

          {found === null ? (
            <p className="text-sm text-muted-foreground">No account uses that email. Use &ldquo;Add staff&rdquo; instead.</p>
          ) : found ? (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <p className="text-sm">
                <span className="font-semibold">{fullName(found)}</span> · currently {ROLE_LABELS[found.role].toLowerCase()}
                {found.is_active ? "" : " · deactivated"}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="promote-role">New access</Label>
                <RoleSelect id="promote-role" value={role} onChange={setRole} includeUser={false} />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!found || !found.is_active || found.role === role || promote.isPending}
              onClick={() => found && promote.mutate(found)}
            >
              {promote.isPending ? "Saving…" : "Give access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shows a one-time set-password link with ways to pass it on. */
function InviteLinkDialog({
  invite,
  onClose,
}: {
  invite: { member: StaffMember; link: StaffInvite } | null;
  onClose: () => void;
}) {
  const url = invite?.link.invite_url ?? "";
  const expires = invite
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(
        new Date(invite.link.invite_expires_at),
      )
    : "";
  const message = invite
    ? `Hi ${invite.member.first_name}, here is your link to set up your Park Vega staff account: ${url}`
    : "";
  const phone = invite?.member.phone_number?.replace(/[^\d]/g, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it instead.");
    }
  }

  return (
    <Dialog open={invite !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite link for {invite ? fullName(invite.member) : ""}</DialogTitle>
          <DialogDescription>
            Send this to them. It works once and expires on {expires}. Email isn&apos;t connected yet, so this link is
            the way in.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} aria-label="Invite link" />
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" className="gap-2" onClick={copy}>
            <Copy className="size-4" aria-hidden="true" />
            Copy link
          </Button>
          <Button asChild variant="outline">
            <a
              href={`https://wa.me/${phone ?? ""}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send on WhatsApp
            </a>
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
