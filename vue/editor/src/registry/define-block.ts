import type { Component } from 'vue';
import type { Attrs, Content, Node } from '../model';
import type { NodeSpec } from '../schema';
import type { CommandFactory } from '../state/command';
import type { InputRuleSpec } from './input-rule';

/** Props passed to an atom/void block's Vue `component`. */
export interface BlockComponentProps {
  /** The block's model node (read its `attrs`). */
  node: Node;
  /** Whether the block is currently node-selected. */
  selected: boolean;
  /** Editor-level editable flag. */
  editable: boolean;
  /** Merge new attrs into the block (e.g. image src/caption). */
  update: (attrs: Attrs) => void;
}

/** Presentational/discovery metadata: powers slash menu, conversion, toolbars. */
export interface BlockMeta {
  readonly title: string;
  readonly icon?: string;
  readonly keywords?: readonly string[];
  readonly group?: string;
}

/** Optional block-specific behaviors used by core commands. */
export interface BlockBehavior {
  /** Content for a fresh empty block of this type (defaults to empty inline). */
  readonly empty?: () => Content;
  /** Plain-text extraction (defaults to inline text). */
  readonly toText?: (node: Node) => string;
}

/**
 * A block definition: schema contribution + behavior + an opaque Vue component.
 * Non-view layers treat `component` as an opaque value; only the view resolves
 * it. The type is `Component` purely for authoring ergonomics (type-only import).
 */
export interface BlockDefinition {
  readonly type: string;
  readonly spec: NodeSpec;
  readonly component?: Component;
  readonly meta?: BlockMeta;
  readonly behavior?: BlockBehavior;
  readonly commands?: Record<string, CommandFactory>;
  /** Wrapper element tag for the block (default `'div'`). */
  readonly as?: string;
  /** Placeholder text shown when an empty text block has focus. */
  readonly placeholder?: string;
  readonly inputRules?: readonly InputRuleSpec[];
}

/** Identity factory that narrows a block definition's literal type (cf. `definePlugin`). */
export function defineBlock<const D extends BlockDefinition>(def: D): D {
  return def;
}
