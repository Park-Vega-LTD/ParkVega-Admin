"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LoadError } from "@/components/parkvega/admin/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientFetch } from "@/lib/api.client";
import { PUBLIC_SITE_URL, publicSiteUrl } from "@/lib/public-site";
import { cn } from "@/lib/utils";

import {
  emptyValue,
  findProblems,
  HOME_SECTIONS,
  youtubeId,
  type Field,
  type SectionSpec,
} from "./section-specs";

type SavedBlock = { page_key: string; block: string; data: Record<string, unknown>; updated_at: string };

export function SectionsManager() {
  return (
    <div className="space-y-8">
      {HOME_SECTIONS.map((spec) => (
        <SectionEditor key={`${spec.page}/${spec.block}`} spec={spec} />
      ))}
    </div>
  );
}

function SectionEditor({ spec }: { spec: SectionSpec }) {
  const queryClient = useQueryClient();
  const key = ["page-blocks", spec.page];
  const blocks = useQuery({
    queryKey: key,
    queryFn: () => clientFetch<SavedBlock[]>(`/api/content/page-blocks?page_key=${spec.page}`),
  });
  const saved = blocks.data?.find((block) => block.block === spec.block) ?? null;
  // A section saved before a field was added gets that field's built-in value.
  const base = React.useMemo(() => ({ ...spec.defaults, ...(saved?.data ?? {}) }), [spec.defaults, saved]);

  const [draft, setDraft] = React.useState<Record<string, unknown> | null>(null);
  const current = draft ?? base;
  const dirty = draft !== null;
  const problems = findProblems({ kind: "object", fields: spec.fields }, current);

  const done = (message: string) => {
    toast.success(message);
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: key });
  };

  const save = useMutation({
    mutationFn: () =>
      clientFetch(`/api/content/page-blocks/${spec.page}/${spec.block}`, {
        method: "PUT",
        body: JSON.stringify({ data: current }),
      }),
    onSuccess: () => done(`${spec.title} saved. It's on the website now.`),
    onError: (error) => toast.error(error.message),
  });

  const reset = useMutation({
    mutationFn: () => clientFetch(`/api/content/page-blocks/${spec.page}/${spec.block}`, { method: "DELETE" }),
    onSuccess: () => done(`${spec.title} is back to the built-in copy.`),
    onError: (error) => toast.error(error.message),
  });

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{spec.title}</h2>
            {blocks.isPending ? null : saved ? (
              <Badge>Edited · {new Date(saved.updated_at).toLocaleDateString()}</Badge>
            ) : (
              <Badge variant="secondary">Built-in copy</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{spec.help}</p>
        </div>
        {PUBLIC_SITE_URL ? (
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <a href={publicSiteUrl(spec.path)} target="_blank" rel="noopener noreferrer">
              View on site <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        ) : null}
      </header>

      {blocks.isError ? <LoadError error={blocks.error} /> : null}

      {blocks.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <FieldsEditor
          fields={spec.fields}
          value={current}
          onChange={setDraft}
          idPrefix={`${spec.page}-${spec.block}`}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button disabled={!dirty || problems.length > 0 || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Discard changes
          </Button>
        ) : null}
        {saved ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={reset.isPending}>
                <RotateCcw className="size-4" aria-hidden="true" /> Reset to built-in copy
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset &ldquo;{spec.title}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your saved text for this section is deleted and the website shows its built-in copy again. This can&apos;t
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => reset.mutate()}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        {dirty && problems.length > 0 ? (
          <p className="text-sm text-destructive">
            {problems[0]}
            {problems.length > 1 ? ` (and ${problems.length - 1} more)` : ""}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FieldsEditor({
  fields,
  value,
  onChange,
  idPrefix,
}: {
  fields: Record<string, Field>;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4">
      {Object.entries(fields).map(([key, field]) => (
        <FieldEditor
          key={key}
          field={field}
          id={`${idPrefix}-${key}`}
          value={value[key]}
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </div>
  );
}

function FieldEditor({
  field,
  id,
  value,
  onChange,
}: {
  field: Field;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "object") {
    return (
      <FieldsEditor
        fields={field.fields}
        value={(value ?? {}) as Record<string, unknown>}
        onChange={onChange}
        idPrefix={id}
      />
    );
  }
  if (field.kind === "list") return <ListEditor field={field} id={id} value={value} onChange={onChange} />;

  const text = typeof value === "string" ? value : "";
  const label = (
    <Label htmlFor={id} className="text-sm">
      {field.label}
      {field.kind === "text" && field.optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
    </Label>
  );
  const help = field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null;

  if (field.kind === "select") {
    return (
      <div className="space-y-1.5">
        {label}
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {help}
      </div>
    );
  }

  if (field.kind === "youtube") {
    return (
      <div className="space-y-1.5">
        {label}
        <Input
          id={id}
          value={text}
          placeholder="https://youtube.com/shorts/…"
          onChange={(e) => onChange(youtubeId(e.target.value))}
        />
        {help}
        {/^[A-Za-z0-9_-]{11}$/.test(text) ? (
          <p className="text-xs text-muted-foreground">Video ID: {text}</p>
        ) : null}
      </div>
    );
  }

  const max = field.kind === "text" ? field.max : 200;
  const count = (
    <span className={cn("text-xs", text.length > max ? "text-destructive" : "text-muted-foreground")}>
      {text.length}/{max}
    </span>
  );
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        {label}
        {field.kind === "text" ? count : null}
      </div>
      {field.kind === "text" && field.long ? (
        <Textarea id={id} rows={3} value={text} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          id={id}
          value={text}
          maxLength={max}
          placeholder={field.kind === "link" ? "/birthday-parties" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {help}
    </div>
  );
}

function ListEditor({
  field,
  id,
  value,
  onChange,
}: {
  field: Extract<Field, { kind: "list" }>;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const items = Array.isArray(value) ? value : [];
  const min = field.min ?? 0;
  const set = (next: unknown[]) => onChange(next);
  const move = (index: number, by: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    set(next);
  };
  const isGroup = field.of.kind === "object";

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold">
        {field.label}{" "}
        <span className="font-normal text-muted-foreground">
          ({items.length}/{field.max})
        </span>
      </legend>
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className={cn("flex gap-3", isGroup && "flex-col rounded-lg bg-muted/50 p-3 sm:flex-row")}
          >
            <span className="w-6 shrink-0 pt-2 text-center font-display font-bold text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <FieldEditor
                field={field.of.kind === "object" ? field.of : ({ ...field.of, label: `${field.itemLabel} ${index + 1}` } as Field)}
                id={`${id}-${index}`}
                value={item}
                onChange={(next) => set(items.map((existing, i) => (i === index ? next : existing)))}
              />
            </div>
            <div className="flex shrink-0 gap-1 self-start pt-6 sm:pt-0">
              <Button variant="ghost" size="icon" aria-label={`Move ${field.itemLabel.toLowerCase()} ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${field.itemLabel.toLowerCase()} ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${field.itemLabel.toLowerCase()} ${index + 1}`}
                disabled={items.length <= min}
                onClick={() => set(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={items.length >= field.max}
        onClick={() => set([...items, emptyValue(field.of)])}
      >
        <Plus className="size-4" aria-hidden="true" /> Add {field.itemLabel.toLowerCase()}
      </Button>
    </fieldset>
  );
}
