import type { Registry } from '../../registry';

/** A slash-menu entry derived from a block definition's metadata. */
export interface SlashItem {
  type: string;
  title: string;
  group: string;
  keywords: readonly string[];
}

/**
 * Build slash-menu items from the registry, filtered by `query` against each
 * block's title and keywords. Data-driven: any newly registered block with
 * `meta` shows up automatically.
 */
export function getSlashItems(registry: Registry, query = ''): SlashItem[] {
  const items: SlashItem[] = registry.listBlocks()
    .filter(def => def.meta !== undefined)
    .map(def => ({
      type: def.type,
      title: def.meta!.title,
      group: def.meta!.group ?? 'blocks',
      keywords: def.meta!.keywords ?? [],
    }));

  const q = query.trim().toLowerCase();
  if (!q)
    return items;

  return items.filter(item =>
    item.title.toLowerCase().includes(q) || item.keywords.some(keyword => keyword.toLowerCase().includes(q)),
  );
}
