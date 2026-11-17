"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, EyeOff, Info, Loader2, MessageCircleQuestion, PenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

  const shownCount = visible.filter((faq) => faq.is_active).length;
  const limit = page === "home" ? 10 : 8;
  const stats = [
    { label: "On this page", value: visible.length },
    { label: "Shown", value: shownCount },
    { label: "Hidden", value: visible.length - shownCount },
  ];
  const startDraft = () => setDraft({ page, question: "", answer: "", is_active: true });

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p id="faq-page-label" className="text-sm font-semibold text-deep">
            Website page
          </p>
          <Button size="sm" onClick={startDraft}>
            <Plus className="size-4" /> Add FAQ
          </Button>
        </div>
        <div role="group" aria-labelledby="faq-page-label" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {FAQ_PAGES.map((option) => {
            const selected = option.value === page;
            const count = counts.get(option.value) ?? 0;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setPage(option.value)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                  selected
                    ? "border-deep bg-deep text-white"
                    : "border-border bg-background text-foreground/75 hover:border-primary hover:text-foreground",
                )}
              >
                {option.label}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs font-bold leading-5",
                    selected
                      ? "bg-primary text-deep"
                      : count
                        ? "bg-ice text-primary-ink"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
        <p className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-ice/60 p-4 text-sm text-deep/80">
          <Info className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
          <span>
            {page === "all"
              ? "These show on every page, after that page's own questions."
              : `The ${faqPageLabel(page)} page shows these first, then the ${shared.length} "Every page" FAQs, up to ${limit} in total. A question already listed here is not repeated.`}
          </span>
        </p>
        <dl className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/70 bg-card">
          {stats.map((stat) => (
            <div key={stat.label} className="px-5 py-3 text-center">
              <dt className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{stat.label}</dt>
              <dd className="font-display text-2xl font-bold text-deep">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {visible.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 p-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-ice text-primary-ink">
            <MessageCircleQuestion className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-deep">No FAQs for this page yet</p>
            <p className="text-sm text-muted-foreground">
              Add the first question visitors ask about {faqPageLabel(page)}.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={startDraft}>
            <Plus className="size-4" /> Add FAQ
          </Button>
        </div>
      ) : (
        <ol className="grid gap-3">
          {visible.map((faq, index) => (
            <li
              key={faq.id}
              className={cn(
                "flex gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/50 sm:gap-4 sm:p-5",
                !faq.is_active && "bg-muted/60 shadow-none",
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl font-display text-sm font-bold",
                    faq.is_active ? "bg-ice text-primary-ink" : "bg-muted text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 min-h-8 rounded-lg text-muted-foreground"
                  aria-label="Move up"
                  disabled={busy || index === 0}
                  onClick={() => move(faq, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 min-h-8 rounded-lg text-muted-foreground"
                  aria-label="Move down"
                  disabled={busy || index === visible.length - 1}
                  onClick={() => move(faq, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("font-semibold text-deep", !faq.is_active && "text-muted-foreground")}>
                    {faq.question}
                  </span>
                  {!faq.is_active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                      <EyeOff className="size-3" aria-hidden="true" /> Hidden
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-start">
                <span className="flex h-8 items-center gap-2 px-1 text-xs font-semibold text-muted-foreground">
                  <span className="hidden sm:inline">{faq.is_active ? "Live" : "Off"}</span>
                  <Switch
                    checked={faq.is_active}
                    disabled={busy}
                    onCheckedChange={(checked) => toggle(faq, checked)}
                    aria-label={faq.is_active ? "Hide from the site" : "Show on the site"}
                  />
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 min-h-8 rounded-lg hover:bg-ice hover:text-primary-ink"
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 min-h-8 rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="Delete"
                    onClick={() => setToDelete(faq)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
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
