import type { Attrs } from '../../model';
import type { Registry } from '../../registry';

/** A slash-menu entry: a block type, optionally with the attrs of one of its variants. */
export interface SlashItem {
  type: string;
  attrs?: Attrs;
  title: string;
  group: string;
  keywords: readonly string[];
  description?: string;
}

/**
 * Every pickable block, one entry per definition — or one per `meta.variants`
 * entry when the definition declares them (Heading 1/2/3). Also what the
 * gutter's "turn into" menu lists, minus the atoms. Data-driven: any newly
 * registered block with `meta` shows up automatically.
 */
export function listBlockItems(registry: Registry): SlashItem[] {
  const items: SlashItem[] = [];

  for (const def of registry.listBlocks()) {
    const meta = def.meta;
    if (!meta)
      continue;

    const base: SlashItem = {
      type: def.type,
      title: meta.title,
      group: meta.group ?? 'blocks',
      keywords: meta.keywords ?? [],
      ...(meta.description !== undefined && { description: meta.description }),
    };

    if (!meta.variants?.length) {
      items.push(base);
      continue;
    }

    for (const variant of meta.variants) {
      items.push({
        ...base,
        attrs: variant.attrs,
        title: variant.title,
        keywords: [...base.keywords, ...(variant.keywords ?? [])],
        ...(variant.description !== undefined && { description: variant.description }),
      });
    }
  }

  return items;
}

/** Slash-menu items filtered by `query` against each item's title and keywords. */
export function getSlashItems(registry: Registry, query = ''): SlashItem[] {
  const items = listBlockItems(registry);
  const q = query.trim().toLowerCase();

  if (!q)
    return items;

  return items.filter(item =>
    item.title.toLowerCase().includes(q) || item.keywords.some(keyword => keyword.toLowerCase().includes(q)),
  );
}

/** What a text block can be turned into: the text-kind entries, the current one flagged. */
export function getTurnIntoItems(registry: Registry): SlashItem[] {
  return listBlockItems(registry).filter(item => registry.getBlock(item.type)?.spec.content.kind === 'text');
}
