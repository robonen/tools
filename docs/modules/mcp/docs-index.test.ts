import { describe, expect, it } from 'vitest';
import type { DocsMetadata, ItemMeta } from '../extractor/types';
import { buildLeaves, countEntries, getPackage, groupPackages, resolveEntry, search } from './docs-index';

function item(partial: Partial<ItemMeta> & Pick<ItemMeta, 'name' | 'slug' | 'kind' | 'description'>): ItemMeta {
  return {
    since: '',
    signatures: [],
    params: [],
    returns: null,
    typeParams: [],
    examples: [],
    methods: [],
    properties: [],
    hasDemo: false,
    demoSource: '',
    hasTests: false,
    relatedTypes: [],
    sourcePath: '',
    entryPoint: '.',
    ...partial,
  };
}

const metadata: DocsMetadata = {
  generatedAt: '2026-06-08T00:00:00.000Z',
  packages: [
    {
      name: '@robonen/stdlib',
      version: '1.0.0',
      description: 'Standard library utilities',
      slug: 'stdlib',
      kind: 'api',
      group: 'core',
      entryPoints: ['.'],
      categories: [
        {
          name: 'Numbers',
          slug: 'numbers',
          items: [
            item({ name: 'clamp', slug: 'clamp', kind: 'function', description: 'Clamp a number to a range' }),
            item({ name: 'debounce', slug: 'debounce', kind: 'function', description: 'Debounce a function call' }),
          ],
        },
      ],
      components: [],
      sections: [],
    },
    {
      name: '@robonen/toolkit',
      version: '2.0.0',
      description: 'Vue composables',
      slug: 'toolkit',
      kind: 'components',
      group: 'vue',
      entryPoints: ['.'],
      categories: [],
      components: [
        {
          name: 'useClipboard',
          slug: 'use-clipboard',
          description: 'Reactive clipboard access',
          entryPoint: './use-clipboard',
          parts: [],
          hasDemo: false,
          demoSource: '',
          sourcePath: '',
        },
      ],
      sections: [],
    },
    {
      name: '@robonen/eslint',
      version: '3.0.0',
      description: 'Shared ESLint config',
      slug: 'eslint',
      kind: 'guide',
      group: 'configs',
      entryPoints: ['.'],
      categories: [],
      components: [],
      sections: [
        { title: 'Imports preset', slug: 'imports', markdown: '# Imports\nSorts and dedupes imports.' },
      ],
    },
  ],
};

describe('buildLeaves', () => {
  it('flattens every leaf across all package kinds', () => {
    const leaves = buildLeaves(metadata);
    expect(leaves).toHaveLength(4);
    expect(leaves.map(l => l.slug).sort()).toEqual(['clamp', 'debounce', 'imports', 'use-clipboard']);
  });

  it('tags each leaf with the right badge', () => {
    const byName = new Map(buildLeaves(metadata).map(l => [l.name, l.badge]));
    expect(byName.get('clamp')).toBe('function');
    expect(byName.get('useClipboard')).toBe('component');
    expect(byName.get('Imports preset')).toBe('guide');
  });
});

describe('search', () => {
  const leaves = buildLeaves(metadata);

  it('returns empty for a blank query', () => {
    expect(search(leaves, '   ')).toEqual([]);
  });

  it('ranks an exact name match first', () => {
    const hits = search(leaves, 'clamp');
    expect(hits[0]?.name).toBe('clamp');
    expect(hits[0]?.packageSlug).toBe('stdlib');
  });

  it('matches on description body, not just names', () => {
    const hits = search(leaves, 'clipboard');
    expect(hits.map(h => h.name)).toContain('useClipboard');
  });

  it('applies AND semantics across tokens', () => {
    expect(search(leaves, 'clamp clipboard')).toEqual([]);
  });

  it('honours the limit', () => {
    expect(search(leaves, 'a', 1)).toHaveLength(1);
  });
});

describe('getPackage / resolveEntry', () => {
  const leaves = buildLeaves(metadata);

  it('finds a package by slug, case-insensitively', () => {
    expect(getPackage(metadata, 'STDLIB')?.name).toBe('@robonen/stdlib');
    expect(getPackage(metadata, 'nope')).toBeUndefined();
  });

  it('resolves an api item by slug or exported name', () => {
    expect(resolveEntry(leaves, 'stdlib', 'clamp')?.kind).toBe('api');
    expect(resolveEntry(leaves, 'stdlib', 'Clamp')?.kind).toBe('api');
  });

  it('resolves a component by slug and by name', () => {
    expect(resolveEntry(leaves, 'toolkit', 'use-clipboard')?.kind).toBe('components');
    expect(resolveEntry(leaves, 'toolkit', 'useClipboard')?.kind).toBe('components');
  });

  it('resolves a guide section', () => {
    const entry = resolveEntry(leaves, 'eslint', 'imports');
    expect(entry?.kind).toBe('guide');
  });

  it('returns undefined for an unknown item', () => {
    expect(resolveEntry(leaves, 'stdlib', 'missing')).toBeUndefined();
  });
});

describe('slug uniqueness & collisions', () => {
  // A function and a co-located type/interface whose names differ only in case
  // both slugify to the same value — the real extractor produces these in
  // @robonen/editor and @robonen/vue.
  const colliding: DocsMetadata = {
    generatedAt: '2026-06-08T00:00:00.000Z',
    packages: [
      {
        name: '@robonen/editor',
        version: '1.0.0',
        description: 'Editor',
        slug: 'editor',
        kind: 'api',
        group: 'vue',
        entryPoints: ['.'],
        categories: [
          {
            name: 'Model',
            slug: 'model',
            items: [
              item({ name: 'position', slug: 'position', kind: 'function', description: 'Create a position' }),
              item({ name: 'Position', slug: 'position', kind: 'interface', description: 'A position' }),
            ],
          },
        ],
        components: [],
        sections: [],
      },
    ],
  };

  it('disambiguates colliding slugs so every (package, slug) pair is unique', () => {
    const leaves = buildLeaves(colliding);
    const slugs = leaves.map(l => l.slug);
    expect(slugs).toEqual(['position', 'position-interface']);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('reaches both colliding symbols — function and interface — independently', () => {
    const leaves = buildLeaves(colliding);
    // Exact case-sensitive name disambiguates the function from the interface.
    const fn = resolveEntry(leaves, 'editor', 'position');
    const iface = resolveEntry(leaves, 'editor', 'Position');
    expect(fn?.kind === 'api' && fn.item.kind).toBe('function');
    expect(iface?.kind === 'api' && iface.item.kind).toBe('interface');
    // The disambiguated slug also resolves the interface directly.
    const bySlug = resolveEntry(leaves, 'editor', 'position-interface');
    expect(bySlug?.kind === 'api' && bySlug.item.kind).toBe('interface');
  });

  it('throws when a slug contains a URI-reserved character', () => {
    const bad: DocsMetadata = {
      generatedAt: '2026-06-08T00:00:00.000Z',
      packages: [{
        name: '@robonen/x', version: '1.0.0', description: '', slug: 'x', kind: 'guide', group: 'infra',
        entryPoints: ['.'], categories: [], components: [],
        sections: [{ title: 'Nested', slug: 'rules/no-foo', markdown: '#' }],
      }],
    };
    expect(() => buildLeaves(bad)).toThrow(/reserved URI character/);
  });
});

describe('grouping helpers', () => {
  it('orders groups core → vue → configs and drops empties', () => {
    expect(groupPackages(metadata).map(g => g.group)).toEqual(['core', 'vue', 'configs']);
  });

  it('counts entries per package kind', () => {
    expect(countEntries(metadata.packages[0]!)).toBe(2);
    expect(countEntries(metadata.packages[1]!)).toBe(1);
    expect(countEntries(metadata.packages[2]!)).toBe(1);
  });
});
