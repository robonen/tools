import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from '../preset';
import { getSlashItems, getTurnIntoItems, listBlockItems } from '../view/ui/slash-items';

describe('block items with variants', () => {
  const registry = createDefaultRegistry();

  it('lists one entry per variant instead of the bare type', () => {
    const headings = listBlockItems(registry).filter(item => item.type === 'heading');
    expect(headings.map(item => item.title)).toEqual(['Heading 1', 'Heading 2', 'Heading 3']);
    expect(headings[1]!.attrs).toEqual({ level: 2 });
  });

  it('filters by a variant keyword', () => {
    expect(getSlashItems(registry, 'h2').map(item => item.title)).toEqual(['Heading 2']);
  });

  it('turn-into offers text blocks only', () => {
    const items = getTurnIntoItems(registry);
    expect(items.some(item => item.type === 'image' || item.type === 'divider')).toBe(false);
    expect(items.some(item => item.type === 'paragraph')).toBe(true);
  });
});
