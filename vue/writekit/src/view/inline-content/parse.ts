import type { Inline, InlineNode, Mark } from '../../model';
import { normalizeInline, normalizeMarks } from '../../model';
import type { Registry } from '../../registry';
import { compiledRules, matchMarks } from '../clipboard/rules';
import { FILLER_ATTR } from './render';

// Zero-width space, built without embedding the literal character in source.
const ZWSP = new RegExp(String.fromCharCode(0x200B), 'g');

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

    walk(el, normalizeMarks([...marks, ...matchMarks(el, compiledRules(registry))]), out, registry);
  }
}

/**
 * Parse a contenteditable host back into normalized inline runs, resolving
 * marks from the registry's `parseDOM` rules. This is the typing path — one
 * block, the DOM writekit painted itself; foreign HTML goes through
 * `view/clipboard`, which also knows about blocks.
 */
export function parseRuns(host: HTMLElement, registry: Registry): Inline {
  const out: InlineNode[] = [];
  walk(host, [], out, registry);
  return normalizeInline(out);
}
