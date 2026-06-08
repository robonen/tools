import type { Inline, InlineNode, Mark } from '../../model';
import { normalizeInline, normalizeMarks } from '../../model';
import type { Registry } from '../../registry';
import { FILLER_ATTR } from './render';

// Zero-width space, built without embedding the literal character in source.
const ZWSP = new RegExp(String.fromCharCode(0x200B), 'g');

/** Marks contributed by a single element, via each mark's `parseDOM` rules. */
function marksForElement(el: HTMLElement, registry: Registry): Mark[] {
  const marks: Mark[] = [];

  for (const def of registry.allMarks()) {
    for (const rule of def.spec.parseDOM) {
      if (!rule.tag || !el.matches(rule.tag))
        continue;

      let attrs = rule.attrs;

      if (rule.getAttrs) {
        const got = rule.getAttrs(el);
        if (got === false || got === null)
          continue;
        attrs = { ...(rule.attrs ?? {}), ...got };
      }

      marks.push(attrs && Object.keys(attrs).length > 0 ? { type: def.type, attrs } : { type: def.type });
      break; // first matching rule wins for this mark
    }
  }

  return marks;
}

function walk(node: Node, marks: readonly Mark[], out: InlineNode[], registry: Registry): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.nodeValue ?? '').replaceAll(ZWSP, '');
      if (text)
        out.push({ text, marks });
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE)
      continue;

    const el = child as HTMLElement;

    if (el.tagName === 'BR') {
      if (!el.hasAttribute(FILLER_ATTR))
        out.push({ text: '\n', marks }); // hard break
      continue;
    }

    walk(el, normalizeMarks([...marks, ...marksForElement(el, registry)]), out, registry);
  }
}

/**
 * Parse a contenteditable host (or any DOM subtree, e.g. pasted HTML) back into
 * normalized inline runs, resolving marks from the registry's `parseDOM` rules.
 */
export function parseRuns(host: HTMLElement, registry: Registry): Inline {
  const out: InlineNode[] = [];
  walk(host, [], out, registry);
  return normalizeInline(out);
}
