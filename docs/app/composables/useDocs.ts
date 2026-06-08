import metadata from '#docs/metadata';
import type {
  CategoryMeta,
  ComponentMeta,
  DocSection,
  DocsMetadata,
  GuideSection,
  ItemMeta,
  PackageGroup,
  PackageMeta,
} from '../../modules/extractor/types';

/** A unified, normalised entry for any documented leaf, regardless of kind. */
export type DocEntry
  = | { kind: 'api'; pkg: PackageMeta; category: CategoryMeta; item: ItemMeta }
    | { kind: 'components'; pkg: PackageMeta; component: ComponentMeta }
    | { kind: 'guide'; pkg: PackageMeta; section: GuideSection }
    | { kind: 'doc'; pkg: PackageMeta; section: DocSection };

export interface SearchResult {
  pkg: PackageMeta;
  slug: string;
  name: string;
  description: string;
  /** Display kind for the badge */
  badge: string;
}

const GROUP_LABELS: Record<PackageGroup, string> = {
  core: 'Core',
  vue: 'Vue',
  configs: 'Configs',
  infra: 'Infra',
};

const GROUP_ORDER: PackageGroup[] = ['core', 'vue', 'configs', 'infra'];

export function useDocs() {
  const data = metadata as unknown as DocsMetadata;

  function getPackages(): PackageMeta[] {
    return data.packages;
  }

  /** Packages grouped & ordered for sidebar / landing. */
  function getGroupedPackages(): Array<{ group: PackageGroup; label: string; packages: PackageMeta[] }> {
    return GROUP_ORDER
      .map(group => ({
        group,
        label: GROUP_LABELS[group],
        packages: data.packages.filter(p => p.group === group),
      }))
      .filter(g => g.packages.length > 0);
  }

  function getPackage(slug: string): PackageMeta | undefined {
    return data.packages.find(p => p.slug === slug);
  }

  /** Number of documented leaves in a package, whatever its kind. */
  function countEntries(pkg: PackageMeta): number {
    if (pkg.kind === 'api') return pkg.categories.reduce((s, c) => s + c.items.length, 0);
    if (pkg.kind === 'components') return pkg.components.length;
    return pkg.sections.length;
  }

  /** The hand-authored intro section for a package, if any. */
  function getIntro(pkg: PackageMeta): DocSection | undefined {
    return pkg.docs.find(s => s.isIntro);
  }

  /** Non-intro doc sections (the "Guide" list shown in the sidebar). */
  function getDocSections(pkg: PackageMeta): DocSection[] {
    return pkg.docs.filter(s => !s.isIntro);
  }

  /** Resolve any `/:package/:slug` route to a normalised entry. */
  function resolveEntry(packageSlug: string, slug: string): DocEntry | undefined {
    const pkg = getPackage(packageSlug);
    if (!pkg) return undefined;

    // Hand-authored doc sections take precedence over auto-generated leaves.
    const docSection = pkg.docs.find(s => !s.isIntro && s.slug === slug);
    if (docSection) return { kind: 'doc', pkg, section: docSection };

    if (pkg.kind === 'api') {
      for (const category of pkg.categories) {
        const item = category.items.find(i => i.slug === slug);
        if (item) return { kind: 'api', pkg, category, item };
      }
    }
    else if (pkg.kind === 'components') {
      const component = pkg.components.find(c => c.slug === slug);
      if (component) return { kind: 'components', pkg, component };
    }
    else {
      const section = pkg.sections.find(s => s.slug === slug);
      if (section) return { kind: 'guide', pkg, section };
    }

    return undefined;
  }

  /** The default entry to open when landing on a package, if any. */
  function firstEntrySlug(pkg: PackageMeta): string | undefined {
    if (pkg.kind === 'api') return pkg.categories[0]?.items[0]?.slug;
    if (pkg.kind === 'components') return pkg.components[0]?.slug;
    return pkg.sections[0]?.slug;
  }

  function search(query: string): SearchResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResult[] = [];

    for (const pkg of data.packages) {
      if (pkg.kind === 'api') {
        for (const category of pkg.categories) {
          for (const item of category.items) {
            if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
              results.push({ pkg, slug: item.slug, name: item.name, description: item.description, badge: item.kind });
            }
          }
        }
      }
      else if (pkg.kind === 'components') {
        for (const c of pkg.components) {
          if (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
            results.push({ pkg, slug: c.slug, name: c.name, description: c.description || `${c.parts.length} parts`, badge: 'component' });
          }
        }
      }
      else {
        for (const s of pkg.sections) {
          if (s.title.toLowerCase().includes(q) || s.markdown.toLowerCase().includes(q)) {
            results.push({ pkg, slug: s.slug, name: s.title, description: pkg.name, badge: 'guide' });
          }
        }
      }
    }

    return results;
  }

  function getTotalItems(): number {
    return data.packages.reduce((sum, pkg) => sum + countEntries(pkg), 0);
  }

  return {
    data,
    getPackages,
    getGroupedPackages,
    getPackage,
    countEntries,
    resolveEntry,
    firstEntrySlug,
    getIntro,
    getDocSections,
    search,
    getTotalItems,
  };
}
