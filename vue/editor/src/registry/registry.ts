import type { MarkSpec, NodeSpec, Schema } from '../schema';
import { createSchema } from '../schema';
import type { BlockDefinition } from './define-block';
import type { MarkDefinition } from './define-mark';

/** How to resolve two definitions registered under the same type. */
export type ConflictPolicy = 'throw' | 'last-wins' | 'first-wins';

/**
 * The single source of truth for which block and mark types exist and how they
 * behave. Immutable: built once via {@link createRegistry}; {@link extendRegistry}
 * returns a new registry. The {@link Schema} is projected from the definitions.
 */
export interface Registry {
  readonly blocks: ReadonlyMap<string, BlockDefinition>;
  readonly marks: ReadonlyMap<string, MarkDefinition>;
  readonly schema: Schema;
  getBlock: (type: string) => BlockDefinition | undefined;
  getMark: (type: string) => MarkDefinition | undefined;
  /** Definitions in registration order (drives slash menu / toolbars). */
  listBlocks: () => readonly BlockDefinition[];
  listMarks: () => readonly MarkDefinition[];
  /** Alias of {@link listMarks}, for the inline renderer/parser. */
  allMarks: () => readonly MarkDefinition[];
  hasBlock: (type: string) => boolean;
  hasMark: (type: string) => boolean;
}

export interface CreateRegistryOptions {
  readonly blocks?: readonly BlockDefinition[];
  readonly marks?: readonly MarkDefinition[];
  readonly onConflict?: ConflictPolicy;
}

function buildMap<D extends { readonly type: string }>(
  items: readonly D[],
  onConflict: ConflictPolicy,
  kind: string,
): Map<string, D> {
  const map = new Map<string, D>();

  for (const item of items) {
    if (map.has(item.type)) {
      if (onConflict === 'throw')
        throw new Error(`Editor registry: duplicate ${kind} type '${item.type}'`);

      if (onConflict === 'first-wins')
        continue;
    }

    map.set(item.type, item);
  }

  return map;
}

/** Build an immutable {@link Registry} from block and mark definitions. */
export function createRegistry(options: CreateRegistryOptions = {}): Registry {
  const onConflict = options.onConflict ?? 'throw';
  const blocks = buildMap(options.blocks ?? [], onConflict, 'block');
  const marks = buildMap(options.marks ?? [], onConflict, 'mark');

  const nodeSpecs = new Map<string, NodeSpec>();
  for (const [type, def] of blocks)
    nodeSpecs.set(type, def.spec);

  const markSpecs = new Map<string, MarkSpec>();
  for (const [type, def] of marks)
    markSpecs.set(type, def.spec);

  const schema = createSchema({ nodes: nodeSpecs, marks: markSpecs });
  const blockList = [...blocks.values()];
  const markList = [...marks.values()];

  return {
    blocks,
    marks,
    schema,
    getBlock: type => blocks.get(type),
    getMark: type => marks.get(type),
    listBlocks: () => blockList,
    listMarks: () => markList,
    allMarks: () => markList,
    hasBlock: type => blocks.has(type),
    hasMark: type => marks.has(type),
  };
}

/** Return a new registry extending `base` with extra blocks/marks (override wins). */
export function extendRegistry(
  base: Registry,
  add: { blocks?: readonly BlockDefinition[]; marks?: readonly MarkDefinition[]; onConflict?: ConflictPolicy },
): Registry {
  return createRegistry({
    blocks: [...base.listBlocks(), ...(add.blocks ?? [])],
    marks: [...base.listMarks(), ...(add.marks ?? [])],
    onConflict: add.onConflict ?? 'last-wins',
  });
}
