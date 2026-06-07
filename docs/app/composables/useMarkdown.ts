import { marked } from 'marked';

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export function slugHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
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

    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*$/);
    if (!m) continue;

    const depth = m[1]!.length;
    const text = m[2]!.replace(/`/g, '').trim();
    let id = slugHeading(text);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;

    headings.push({ depth, text, id });
  }

  return headings;
}

/** Render markdown to HTML with stable heading ids (matching extractHeadings). */
export function renderMarkdown(markdown: string): string {
  const seen = new Map<string, number>();

  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const inner = this.parser.parseInline(tokens);
    const plain = inner.replace(/<[^>]+>/g, '');
    let id = slugHeading(plain);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
  };

  return marked.parse(markdown, { renderer, async: false }) as string;
}
