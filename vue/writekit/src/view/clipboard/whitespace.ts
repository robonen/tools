import type { Inline, InlineNode } from '../../model';

/** Characters that carry no text and only ever come from other editors' internals. */
const ZERO_WIDTH = /[\u200B\uFEFF]/g;
/** HTML collapsible whitespace; no-break spaces come along because word processors use them for runs of spaces. */
const COLLAPSIBLE = /[\t\n\r \u00A0]+/g;

/** Text as HTML lays it out: runs of whitespace become one space (unless preserved, as in `<pre>`). */
export function normalizeText(text: string, preserve: boolean): string {
  const clean = text.replaceAll(ZERO_WIDTH, '');
  return preserve ? clean.replaceAll('\r\n', '\n') : clean.replaceAll(COLLAPSIBLE, ' ');
}

/**
 * Tidy a block's runs at the edges: no leading/trailing whitespace or hard
 * breaks, and no double spaces where two runs meet. Preserved (pre) content
 * only sheds the newline HTML itself ignores at the start and a trailing one.
 */
export function trimInline(runs: Inline, preserve: boolean): Inline {
  if (preserve)
    return trimEdges(runs, ch => ch === '\n', 1);

  const out: InlineNode[] = [];
  let previousSpace = true; // as if at a block start: leading spaces vanish

  for (const run of runs) {
    let text = '';

    for (const ch of run.text) {
      if (ch === ' ') {
        if (!previousSpace)
          text += ch;
        previousSpace = true;
      }
      else {
        // Spaces next to a hard break are invisible in HTML; drop the one before it.
        if (ch === '\n' && text.endsWith(' '))
          text = text.slice(0, -1);
        text += ch;
        previousSpace = ch === '\n';
      }
    }

    if (text)
      out.push({ text, marks: run.marks });
  }

  return trimEdges(out, ch => ch === ' ' || ch === '\n', Infinity);
}

/** Strip up to `limit` characters satisfying `test` from each end of the runs. */
function trimEdges(runs: Inline, test: (ch: string) => boolean, limit: number): Inline {
  const out = runs.map(run => ({ ...run }));

  let left = limit;
  while (out.length > 0 && left > 0) {
    const first = out[0]!;
    if (!first.text || !test(first.text[0]!))
      break;
    first.text = first.text.slice(1);
    left--;
    if (!first.text)
      out.shift();
  }

  let right = limit;
  while (out.length > 0 && right > 0) {
    const last = out[out.length - 1]!;
    if (!last.text || !test(last.text[last.text.length - 1]!))
      break;
    last.text = last.text.slice(0, -1);
    right--;
    if (!last.text)
      out.pop();
  }

  return out.filter(run => run.text.length > 0);
}
