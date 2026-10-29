import type { ReactNode } from "react";

/**
 * Renders the blog's markdown-lite body as React elements – never as raw
 * HTML, so staff-entered text can't inject markup or scripts.
 *
 * Supported: blank-line paragraphs, `## ` / `### ` headings, `- ` bullet and
 * `1. ` numbered lists, `> ` quotes, `![alt](url)` images on their own line,
 * and inline `**bold**` and `[link](https://…)`.
 */

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${match.index}`;
    if (match[1]) {
      nodes.push(<strong key={key} className="font-semibold text-foreground">{match[1]}</strong>);
    } else if (SAFE_URL.test(match[3])) {
      const external = /^https?:/i.test(match[3]);
      nodes.push(
        <a
          key={key}
          href={match[3]}
          className="font-semibold text-primary-ink underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {match[2]}
        </a>,
      );
    } else {
      nodes.push(match[2]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ body, className }: { body: string; className?: string }) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        const lines = block.split("\n").map((line) => line.trim());
        const image = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);

        if (image && SAFE_URL.test(image[2])) {
          return (
            <figure key={key} className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element -- CMS image from any allowed host; lazy-loaded */}
              <img src={image[2]} alt={image[1]} loading="lazy" decoding="async" className="w-full rounded-3xl" />
              {image[1] && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{image[1]}</figcaption>}
            </figure>
          );
        }
        if (block.startsWith("### ")) {
          return <h3 key={key} className="mt-8 text-xl font-semibold text-foreground">{inline(block.slice(4), key)}</h3>;
        }
        if (block.startsWith("## ")) {
          return <h2 key={key} className="mt-10 text-2xl font-semibold text-foreground sm:text-3xl">{inline(block.slice(3), key)}</h2>;
        }
        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={key} className="list-disc space-y-2 pl-6">
              {lines.map((line, i) => <li key={i}>{inline(line.replace(/^[-*]\s+/, ""), `${key}-${i}`)}</li>)}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
          return (
            <ol key={key} className="list-decimal space-y-2 pl-6">
              {lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+[.)]\s+/, ""), `${key}-${i}`)}</li>)}
            </ol>
          );
        }
        if (lines.every((line) => line.startsWith(">"))) {
          return (
            <blockquote key={key} className="border-l-4 border-primary pl-4 text-lg italic text-foreground">
              {inline(lines.map((line) => line.replace(/^>\s?/, "")).join(" "), key)}
            </blockquote>
          );
        }
        return (
          <p key={key}>
            {lines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {inline(line, `${key}-${i}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
