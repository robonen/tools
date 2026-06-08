import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from '../preset';
import { getSlashItems } from '../view/ui';

describe('getSlashItems', () => {
  it('returns every block with meta when the query is empty', () => {
    const items = getSlashItems(createDefaultRegistry());
    const types = items.map(item => item.type);
    expect(types).toContain('heading');
    expect(types).toContain('image');
    expect(items.length).toBeGreaterThan(5);
  });

  it('filters by title and keywords', () => {
    const registry = createDefaultRegistry();
    expect(getSlashItems(registry, 'quote').some(item => item.type === 'blockquote')).toBe(true);
    expect(getSlashItems(registry, 'h1').some(item => item.type === 'heading')).toBe(true);
    expect(getSlashItems(registry, 'zzzz')).toEqual([]);
  });
});
