import type { Inline, Mark } from '../../model';
import type { Registry } from '../../registry';
import type { DOMOutputSpec } from '../../schema';

/** Attribute marking the filler `<br>` of an empty block (not a real newline). */
export const FILLER_ATTR = 'data-editor-br-filler';

function markRank(registry: Registry, mark: Mark): number {
  return registry.getMark(mark.type)?.spec.rank ?? 0;
}

function isAttrsObject(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Realize a mark's `toDOM` spec into a wrapper element (content appended later). */
function createWrapper(spec: DOMOutputSpec, markType: string): HTMLElement {
  if (typeof spec === 'string') {
    const el = document.createElement(spec);
    el.setAttribute('data-mark', markType);
    return el;
  }

  const [tag, ...rest] = spec as readonly unknown[];
  const el = document.createElement(typeof tag === 'string' ? tag : 'span');

  if (rest.length > 0 && isAttrsObject(rest[0])) {
    for (const [key, value] of Object.entries(rest[0]))
      el.setAttribute(key, String(value));
  }

  el.setAttribute('data-mark', markType);
  return el;
}

/** Build the innermost content for a run, turning `\n` into hard-break `<br>`. */
function buildInner(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const segments = text.split('\n');

  segments.forEach((segment, index) => {
    if (index > 0)
      frag.appendChild(document.createElement('br'));
    if (segment.length > 0)
      frag.appendChild(document.createTextNode(segment));
  });

  return frag;
}

function wrapWithMarks(inner: Node, marks: readonly Mark[], registry: Registry): Node {
  let node = inner;

  for (let i = marks.length - 1; i >= 0; i--) {
    const def = registry.getMark(marks[i]!.type);
    if (!def)
      continue;

    const wrapper = createWrapper(def.spec.toDOM(marks[i]!), marks[i]!.type);
    wrapper.appendChild(node);
    node = wrapper;
  }

  return node;
}

/**
 * Render inline content into a contenteditable host imperatively (never via
 * Vue's template diff, which would fight the caret). Marks nest by `rank`
 * (lower = outer) for stable, deterministic output. An empty block gets a single
 * filler `<br>` so it has height and a caret target.
 */
export function renderRuns(host: HTMLElement, inline: Inline, registry: Registry): void {
  const frag = document.createDocumentFragment();
  let total = 0;

  for (const run of inline) {
    total += run.text.length;
    const marks = [...run.marks].sort((a, b) => markRank(registry, a) - markRank(registry, b));
    frag.appendChild(wrapWithMarks(buildInner(run.text), marks, registry));
  }

  if (total === 0) {
    const filler = document.createElement('br');
    filler.setAttribute(FILLER_ATTR, '');
    frag.appendChild(filler);
  }

  host.replaceChildren(frag);
}
