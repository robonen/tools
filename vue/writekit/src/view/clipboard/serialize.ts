import type { Node, Slice } from '../../model';
import { createDoc, createSlice, isInlineContent, sliceText, withFreshIds } from '../../model';
import type { Registry } from '../../registry';
import type { DOMOutputSpec } from '../../schema';
import { normalizeDocument } from '../../schema';
import { renderRuns } from '../inline-content';

/**
 * The clipboard type writekit reads back losslessly: a fragment as JSON.
 * Other apps ignore it; writekit prefers it to `text/html`, so marks with
 * attrs a foreign parser would flatten survive a copy/paste round trip.
 */
export const WRITEKIT_MIME = 'application/x-writekit';

export interface SerializedSlice {
  readonly html: string;
  readonly text: string;
  /** The fragment itself, for {@link WRITEKIT_MIME}. */
  readonly json: string;
}

interface Rendered {
  readonly node: globalThis.Node;
  /** Where the content goes, when the spec left a `0` hole. */
  readonly hole: HTMLElement | null;
}

/**
 * Realize a `DOMOutputSpec`: a bare string is a tag, an array is
 * `[tag, attrs?, ...children]` where a string child is text and `0` is the
 * content hole. Pure structure — the caller fills the hole.
 */
export function renderSpec(spec: DOMOutputSpec, doc: Document): Rendered {
  if (typeof spec === 'string')
    return { node: doc.createElement(spec), hole: null };

  const [tag, ...rest] = spec;
  const el = doc.createElement(typeof tag === 'string' ? tag : 'div');
  let hole: HTMLElement | null = null;
  let children = rest;

  const first = rest[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    for (const [key, value] of Object.entries(first))
      el.setAttribute(key, String(value));
    children = rest.slice(1);
  }

  for (const child of children) {
    if (child === 0) {
      hole = el;
    }
    else if (typeof child === 'string') {
      el.appendChild(doc.createTextNode(child));
    }
    else if (Array.isArray(child)) {
      const inner = renderSpec(child as DOMOutputSpec, doc);
      el.appendChild(inner.node);
      hole ??= inner.hole;
    }
  }

  return { node: el, hole };
}

/** HTML for other apps: each block through its `toDOM`, runs through the same renderer the editor paints with. */
function toHtml(slice: Slice, registry: Registry): string {
  const doc = document.implementation.createHTMLDocument('');
  const root = doc.createElement('div');

  for (const block of slice.blocks) {
    const def = registry.getBlock(block.type);
    const spec = def?.spec.toDOM?.(block) ?? (isInlineContent(block.content) ? ['p', 0] as const : null);

    if (!spec)
      continue;

    const { node, hole } = renderSpec(spec, doc);
    if (hole && isInlineContent(block.content))
      renderRuns(hole, block.content, registry);
    root.appendChild(node);
  }

  return root.innerHTML;
}

export function serializeSlice(slice: Slice, registry: Registry): SerializedSlice {
  return {
    html: toHtml(slice, registry),
    text: sliceText(slice),
    json: JSON.stringify({ blocks: slice.blocks, openStart: slice.openStart, openEnd: slice.openEnd }),
  };
}

function isNodeLike(value: unknown): value is Node {
  return typeof value === 'object' && value !== null
    && typeof (value as Node).id === 'string'
    && typeof (value as Node).type === 'string'
    && typeof (value as Node).attrs === 'object';
}

/**
 * Read a fragment written by {@link serializeSlice}. Anything that is not the
 * expected shape yields `null` so the caller falls back to HTML; whatever
 * passes goes through the schema funnel like every other document.
 */
export function parseJsonSlice(json: string, registry: Registry): Slice | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  }
  catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as { blocks?: unknown }).blocks))
    return null;

  const raw = parsed as { blocks: unknown[]; openStart?: unknown; openEnd?: unknown };
  const blocks = raw.blocks.filter(isNodeLike);

  if (blocks.length !== raw.blocks.length)
    return null;

  const normalized = normalizeDocument(createDoc(withFreshIds(blocks)), registry.schema).content;
  return createSlice(normalized, raw.openStart === true, raw.openEnd === true);
}
