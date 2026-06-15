import type { Node } from '../model';
import type { AttrsSpec } from './attr-spec';
import type { ContentKind } from './content-kind';
import type { DOMOutputSpec, ParseRule } from './dom';

/** Schema contribution of a block type. */
export interface NodeSpec {
  /** Content model (text / container / atom). */
  readonly content: ContentKind;
  /** Attribute specs (defaults + validation). */
  readonly attrs?: AttrsSpec;
  /** Group name for membership tests (e.g. `'block'`, `'list'`). */
  readonly group?: string;
  /** Keep this block's type/identity when merged into (e.g. code-block). */
  readonly defining?: boolean;
  /** Raw multiline text: Enter inserts a newline instead of splitting (code-block). */
  readonly code?: boolean;
  /** Selection and merge cannot cross this block's boundary. */
  readonly isolating?: boolean;
  /** Serialize a node of this type to a DOM description (HTML export). */
  readonly toDOM?: (node: Node) => DOMOutputSpec;
  /** Rules for parsing DOM into a node of this type (paste / import). */
  readonly parseDOM?: readonly ParseRule[];
}
