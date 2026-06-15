import type { Attrs } from '../model';

/**
 * A pattern that transforms the current block or marks when typed (e.g. `'# '`
 * → heading, `'**x**'` → bold). The matching engine lands in M2; the type is
 * declared now so block/mark definitions can carry their rules as data.
 */
export interface InputRuleSpec {
  /** Pattern tested against the text ending at the caret. */
  readonly match: RegExp;
  /** Target block/mark type to apply on match. */
  readonly type?: string;
  /** Attrs to apply with the transformation. */
  readonly attrs?: Attrs;
}
