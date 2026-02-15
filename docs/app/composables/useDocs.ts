import metadata from '#docs/metadata';
import type { DocsMetadata, PackageMeta, CategoryMeta, ItemMeta } from '../../modules/extractor/types';

export function useDocs() {
  const data = metadata as unknown as DocsMetadata;

  function getPackages(): PackageMeta[] {
    return data.packages;
  }

  function getPackage(slug: string): PackageMeta | undefined {
    return data.packages.find(p => p.slug === slug);
  }

  function getItem(packageSlug: string, itemSlug: string): { pkg: PackageMeta; category: CategoryMeta; item: ItemMeta } | undefined {
    const pkg = getPackage(packageSlug);
    if (!pkg) return undefined;

    for (const category of pkg.categories) {
      const item = category.items.find(i => i.slug === itemSlug);
      if (item) return { pkg, category, item };
    }

    return undefined;
  }

  function searchItems(query: string): Array<{ pkg: PackageMeta; item: ItemMeta }> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: Array<{ pkg: PackageMeta; item: ItemMeta }> = [];

    for (const pkg of data.packages) {
      for (const category of pkg.categories) {
        for (const item of category.items) {
          if (
            item.name.toLowerCase().includes(q)
            || item.description.toLowerCase().includes(q)
          ) {
            results.push({ pkg, item });
          }
        }
      }
    }

    return results;
  }

  function getTotalItems(): number {
    return data.packages.reduce(
      (sum, pkg) => sum + pkg.categories.reduce(
        (catSum, cat) => catSum + cat.items.length, 0,
      ), 0,
    );
  }

  return {
    data,
    getPackages,
    getPackage,
    getItem,
    searchItems,
    getTotalItems,
  };
}
