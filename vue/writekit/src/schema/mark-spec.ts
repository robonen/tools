import type { Mark } from '../model';
import type { AttrsSpec } from './attr-spec';
import type { DOMOutputSpec, ParseRule } from './dom';

/** Schema contribution of a mark type. */
export interface MarkSpec {
  /** Attribute specs (defaults + validation), e.g. link `href`. */
  readonly attrs?: AttrsSpec;
  /** Whether typing at the mark's boundary extends it (bold yes, link no). */
  readonly inclusive?: boolean;
  /** Marks that cannot coexist with this one; `'_all'` excludes every other. */
  readonly excludes?: readonly string[] | '_all';
  /** Nesting order in {@link DOMOutputSpec}: lower = outer wrapper. */
  readonly rank?: number;
  /** Serialize the mark to a DOM description wrapping its content. */
  readonly toDOM: (mark: Mark) => DOMOutputSpec;
  /** Rules for parsing DOM into this mark (paste / import). */
  readonly parseDOM: readonly ParseRule[];
}
