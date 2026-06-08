import type { Attrs } from '../model';

/** Placeholder marking where a node/mark's content should be spliced in. */
export type DOMOutputHole = 0;

export type DOMOutputChild = DOMOutputSpec | DOMOutputHole;

/**
 * A serializable description of DOM output (ProseMirror-style), kept free of
 * real DOM so the schema layer stays pure. The view realizes it into elements.
 *
 * - `'text'` → a text node,
 * - `['tag', { attr: 'v' }, 0]` → `<tag attr="v">…content…</tag>`,
 * - the attrs object is optional; `0` is the content hole.
 *
 * The array part is an interface so the recursion (an element may contain nested
 * elements) is well-founded for the type checker.
 */
export type DOMOutputSpec = string | DOMOutputArray;

export interface DOMOutputArray extends ReadonlyArray<string | Record<string, string> | DOMOutputChild> {}

/**
 * A rule for parsing DOM (paste / HTML import) into a block or mark.
 * `getAttrs` receives a real `HTMLElement` (only ever called by the view); the
 * type reference is compile-time only and introduces no runtime DOM dependency.
 */
export interface ParseRule {
  /** CSS selector to match, e.g. `'a[href]'`, `'strong'`, `'h1'`. */
  readonly tag?: string;
  /** Inline-style match, e.g. `'font-weight=700'` (reserved for M2). */
  readonly style?: string;
  /** Static attrs applied when the rule matches. */
  readonly attrs?: Attrs;
  /** Derive attrs from the matched element; `false`/`null` rejects the match. */
  readonly getAttrs?: (el: HTMLElement) => Attrs | false | null;
  /** Higher priority rules are tried first. */
  readonly priority?: number;
}
