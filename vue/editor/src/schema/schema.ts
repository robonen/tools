import type { AttrValue, Attrs } from '../model';
import type { AttrsSpec } from './attr-spec';
import type { NodeSpec } from './node-spec';
import type { MarkSpec } from './mark-spec';

/**
 * The compiled schema: the set of known node/mark specs plus attribute
 * coercion helpers. Projected from the registry (the registry is the SSOT).
 */
export interface Schema {
  readonly nodes: ReadonlyMap<string, NodeSpec>;
  readonly marks: ReadonlyMap<string, MarkSpec>;
  nodeSpec: (type: string) => NodeSpec | undefined;
  markSpec: (type: string) => MarkSpec | undefined;
  /** Default attrs for a block type (all defaults applied). */
  defaultAttrs: (type: string) => Attrs;
  /** Fill defaults and drop unknown keys for a block type. */
  coerceAttrs: (type: string, attrs?: Attrs) => Attrs;
  /** Default attrs for a mark type. */
  defaultMarkAttrs: (type: string) => Attrs;
  /** Fill defaults and drop unknown keys for a mark type. */
  coerceMarkAttrs: (type: string, attrs?: Attrs) => Attrs;
}

function coerceWithSpec(spec: AttrsSpec | undefined, attrs?: Attrs): Attrs {
  if (!spec)
    return {};

  const result: Record<string, AttrValue> = {};

  for (const key in spec) {
    const provided = attrs?.[key];

    if (provided !== undefined)
      result[key] = provided;
    else if (spec[key]!.default !== undefined)
      result[key] = spec[key]!.default!;
  }

  return result;
}

/** Build a {@link Schema} from node and mark spec maps. */
export function createSchema(input: {
  nodes: ReadonlyMap<string, NodeSpec>;
  marks: ReadonlyMap<string, MarkSpec>;
}): Schema {
  const { nodes, marks } = input;

  return {
    nodes,
    marks,
    nodeSpec: type => nodes.get(type),
    markSpec: type => marks.get(type),
    defaultAttrs: type => coerceWithSpec(nodes.get(type)?.attrs),
    coerceAttrs: (type, attrs) => coerceWithSpec(nodes.get(type)?.attrs, attrs),
    defaultMarkAttrs: type => coerceWithSpec(marks.get(type)?.attrs),
    coerceMarkAttrs: (type, attrs) => coerceWithSpec(marks.get(type)?.attrs, attrs),
  };
}

/** Whether a block spec holds inline (text) content. */
export function isTextBlock(spec: NodeSpec): boolean {
  return spec.content.kind === 'text';
}

/** Whether a block spec is an atom/void block. */
export function isAtomBlock(spec: NodeSpec): boolean {
  return spec.content.kind === 'atom';
}

/** Whether a block spec is a container of child blocks. */
export function isContainerBlock(spec: NodeSpec): boolean {
  return spec.content.kind === 'container';
}

/** Whether a mark of `markType` is allowed inside a block with this spec. */
export function marksAllowed(spec: NodeSpec, markType: string): boolean {
  if (spec.content.kind !== 'text')
    return false;

  const allowed = spec.content.marks;

  if (allowed === undefined || allowed === 'all')
    return true;

  if (allowed === 'none')
    return false;

  return allowed.includes(markType);
}
