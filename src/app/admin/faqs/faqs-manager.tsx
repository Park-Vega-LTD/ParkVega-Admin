"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/api.client";
import { FAQ_PAGES, faqPageLabel, type FaqPage, type StaffFaq } from "@/lib/faqs";
import { cn } from "@/lib/utils";

type Draft = { id?: string; page: FaqPage; question: string; answer: string; is_active: boolean };

const byPosition = (a: StaffFaq, b: StaffFaq) => a.display_position - b.display_position;

/**
 * Staff screen for the website FAQs (`/api/content/faqs`): pick a page, then
 * add, edit, hide, reorder or delete its questions. Every save goes through
 * the BFF proxy, which also refreshes the public site.
 */
export function FaqsManager({ initial }: { initial: StaffFaq[] }) {
  const [faqs, setFaqs] = React.useState(() => [...initial].sort(byPosition));
  const [page, setPage] = React.useState<FaqPage>("home");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [toDelete, setToDelete] = React.useState<StaffFaq | null>(null);
  const [busy, setBusy] = React.useState(false);

  const visible = faqs.filter((faq) => faq.page === page);
  const shared = page === "all" ? [] : faqs.filter((faq) => faq.page === "all" && faq.is_active);
  const counts = new Map<string, number>();
  for (const faq of faqs) counts.set(faq.page, (counts.get(faq.page) ?? 0) + 1);

  async function run<T>(work: () => Promise<T>, success: string): Promise<T | undefined> {
    setBusy(true);
    try {
      const result = await work();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error((error as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const body = JSON.stringify({
      page: draft.page,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      is_active: draft.is_active,
    });
    const saved = await run(
      () =>
        draft.id
          ? clientFetch<StaffFaq>(`/api/content/faqs/${draft.id}`, { method: "PATCH", body })
          : clientFetch<StaffFaq>("/api/content/faqs", { method: "POST", body }),
      "Saved – the site is updated.",
    );
    if (!saved) return;
    setFaqs((current) => [...current.filter((faq) => faq.id !== saved.id), saved].sort(byPosition));
    setPage(saved.page);
    setDraft(null);
  }

  async function toggle(faq: StaffFaq, is_active: boolean) {
    const saved = await run(
      () =>
        clientFetch<StaffFaq>(`/api/content/faqs/${faq.id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_active }),
        }),
      is_active ? "Shown on the site." : "Hidden from the site.",
    );
    if (saved) setFaqs((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  /** Swaps a FAQ with its neighbour on the same page, keeping every other FAQ where it is. */
  async function move(faq: StaffFaq, direction: -1 | 1) {
    const index = visible.findIndex((item) => item.id === faq.id);
    const neighbour = visible[index + direction];
    if (!neighbour) return;
    const ids = faqs.map((item) => item.id);
    const a = ids.indexOf(faq.id);
    const b = ids.indexOf(neighbour.id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    const saved = await run(
      () => clientFetch<StaffFaq[]>("/api/content/faqs/order", { method: "PUT", body: JSON.stringify({ ids }) }),
      "Order saved.",
    );
    if (saved) setFaqs([...saved].sort(byPosition));
  }

  async function remove() {
    if (!toDelete) return;
    const id = toDelete.id;
    const done = await run(
      () => clientFetch<void>(`/api/content/faqs/${id}`, { method: "DELETE" }).then(() => true),
      "FAQ deleted.",
    );
    if (done) setFaqs((current) => current.filter((faq) => faq.id !== id));
    setToDelete(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <Label htmlFor="faq-page">Website page</Label>
          <Select value={page} onValueChange={(value) => setPage(value as FaqPage)}>
            <SelectTrigger id="faq-page" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FAQ_PAGES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} ({counts.get(option.value) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDraft({ page, question: "", answer: "", is_active: true })}>
          <Plus className="size-4" /> Add FAQ
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {page === "all"
          ? "These show on every page, after that page's own questions."
          : `The ${faqPageLabel(page)} page shows these first, then the ${shared.length} "Every page" FAQs, up to 8 in total (10 on the homepage). A question already listed here is not repeated.`}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No FAQs for this page yet.
        </p>
      ) : (
        <ol className="divide-y rounded-2xl border bg-card">
          {visible.map((faq, index) => (
            <li key={faq.id} className={cn("flex gap-4 p-4", !faq.is_active && "opacity-60")}>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move up"
                  disabled={busy || index === 0}
                  onClick={() => move(faq, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Move down"
                  disabled={busy || index === visible.length - 1}
                  onClick={() => move(faq, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{faq.question}</span>
                  {!faq.is_active && <Badge variant="secondary">Hidden</Badge>}
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <Switch
                  checked={faq.is_active}
                  disabled={busy}
                  onCheckedChange={(checked) => toggle(faq, checked)}
                  aria-label={faq.is_active ? "Hide from the site" : "Show on the site"}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit"
                  onClick={() =>
                    setDraft({
                      id: faq.id,
                      page: faq.page,
                      question: faq.question,
                      answer: faq.answer,
                      is_active: faq.is_active,
                    })
                  }
                >
                  <PenLine className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setToDelete(faq)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-2xl">
          {draft && (
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>{draft.id ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
                <DialogDescription>
                  Start each bullet point on a new line with &ldquo;•&rdquo;. Line breaks show on the site.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="faq-draft-page">Show on</Label>
                <Select value={draft.page} onValueChange={(value) => setDraft({ ...draft, page: value as FaqPage })}>
                  <SelectTrigger id="faq-draft-page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAQ_PAGES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  value={draft.question}
                  maxLength={500}
                  required
                  onChange={(event) => setDraft({ ...draft, question: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  value={draft.answer}
                  maxLength={5000}
                  rows={8}
                  required
                  onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-3 text-sm font-medium">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
                />
                Show on the website
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{toDelete?.question}&rdquo; will be removed from the website. To take it down for now, hide it
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
