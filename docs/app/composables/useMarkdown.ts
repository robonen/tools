import { marked } from 'marked';

// JSDoc `{@link Symbol}` / `{@link Symbol|label}`. The capture starts with a
// non-space char so the leading `\s+` can't overlap it (no super-linear backtracking).
const JSDOC_LINK = /\{@link\s+([^\s}|][^}|]*)(?:\|[^}]+)?\}/g;

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export function slugHeading(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('`', '')
    .replaceAll(/[^\w\s-]/g, '')
    .trim()
    .replaceAll(/\s+/g, '-');
}

/** Collect h2/h3 headings for the table of contents. */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{2,3})\s+(\S.*)$/);
    if (!m) continue;

    const depth = m[1]!.length;
    // Strip an optional ATX closing run (a single space then trailing `#`s) without
    // a backtracking-prone pattern, then drop inline code ticks.
    const text = m[2]!.replace(/ #+ *$/, '').replaceAll('`', '').trim();
    let id = slugHeading(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;

    headings.push({ depth, text, id });
  }

  return headings;
}

/**
 * Render a short description as INLINE HTML (bold/code/links, no block wrapping).
 * Used for API/param/property descriptions, which are authored as one-line
 * markdown with the occasional JSDoc `{@link X}` (shown as inline code).
 */
export function renderInline(text: string): string {
  if (!text) return '';
  const withLinks = text.replaceAll(JSDOC_LINK, (_m, name: string) => `\`${name.trim()}\``);
  return marked.parseInline(withLinks, { async: false }) as string;
}

/** Render markdown to HTML with stable heading ids (matching extractHeadings). */
export function renderMarkdown(markdown: string): string {
  const seen = new Map<string, number>();

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    const plain = inner.replaceAll(/<[^>]+>/g, '');
    let id = slugHeading(plain);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
  };

  return marked.parse(markdown, { renderer, async: false }) as string;
}
