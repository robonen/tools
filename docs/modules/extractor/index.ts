/**
 * Nuxt module that extracts TypeScript metadata from source packages
 * and provides it as a virtual module `#docs/metadata`.
 *
 * Runs extraction at build start and makes the data available to all
 * pages/components via `import metadata from '#docs/metadata'`.
 */

import { defineNuxtModule, addTemplate, createResolver } from '@nuxt/kit';
import { resolve, dirname } from 'node:path';
import type { DocsMetadata } from './types';

export default defineNuxtModule({
  meta: {
    name: 'docs-extractor',
    configKey: 'docsExtractor',
  },

  async setup(_options, nuxt) {
    const { resolve: resolveModule } = createResolver(import.meta.url);
    const ROOT = resolve(import.meta.dirname, '..', '..', '..');

    // Run extraction immediately during setup so metadata is available
    // when templates are resolved (app:templates phase runs before build:before)
    console.log('[docs-extractor] Running metadata extraction...');
    const { extract } = await import('./extract');
    const metadata: DocsMetadata = extract();

    // Add Vite resolve aliases for source packages so demo.vue imports resolve.
    // The vue/toolkit package uses `@/` path aliases (e.g. `@/composables/...`).
    // We prepend them via vite:extendConfig so they take priority over Nuxt's
    // built-in `@` → srcDir alias.
    const vueSrc = resolve(ROOT, 'vue/toolkit/src');

    nuxt.hook('vite:extendConfig', (config) => {
      const existing = config.resolve?.alias;
      const sourceAliases = [
        { find: '@/composables', replacement: resolve(vueSrc, 'composables') },
        { find: '@/types', replacement: resolve(vueSrc, 'types') },
        { find: '@/utils', replacement: resolve(vueSrc, 'utils') },
      ];

      if (Array.isArray(existing)) {
        existing.unshift(...sourceAliases);
      }
      else {
        config.resolve ??= {};
        config.resolve.alias = [
          ...sourceAliases,
          ...Object.entries(existing ?? {}).map(([find, replacement]) => ({ find, replacement: replacement as string })),
        ];
      }
    });

    // Provide metadata as a virtual template
    addTemplate({
      filename: 'docs-metadata.ts',
      write: true,
      getContents: () => {
        const json = JSON.stringify(metadata, null, 2);
        return `export default ${json} as const;`;
      },
    });

    // Register the alias for the virtual module
    nuxt.options.alias['#docs/metadata'] = resolve(nuxt.options.buildDir, 'docs-metadata');

    // Add types reference
    addTemplate({
      filename: 'docs-metadata-types.d.ts',
      write: true,
      getContents: () => {
        const typesPath = resolveModule('./types');
        return `
import type { DocsMetadata } from '${typesPath}';
declare module '#docs/metadata' {
  const metadata: DocsMetadata;
  export default metadata;
}
`;
      },
    });

    // Register prerender routes from metadata
    nuxt.hook('prerender:routes', async ({ routes }: { routes: Set<string> }) => {
      if (metadata.packages.length === 0) return;

      for (const pkg of metadata.packages) {
        routes.add(`/${pkg.slug}`);
        for (const category of pkg.categories) {
          for (const item of category.items) {
            routes.add(`/${pkg.slug}/${item.slug}`);
          }
        }
      }

      console.log(`[docs-extractor] Registered ${routes.size} routes for prerender`);
    });

    // Generate demo component import map
    addTemplate({
      filename: 'docs-demos.ts',
      write: true,
      getContents: () => {
        const entries: string[] = [];

        for (const pkg of metadata.packages) {
          for (const cat of pkg.categories) {
            for (const item of cat.items) {
              if (item.hasDemo) {
                const demoPath = resolve(ROOT, dirname(item.sourcePath), 'demo.vue');
                entries.push(`  '${pkg.slug}/${item.slug}': defineAsyncComponent(() => import('${demoPath}')),`);
              }
            }
          }
        }

        if (entries.length === 0) {
          return `import type { Component } from 'vue';\nexport const demos: Record<string, Component> = {};\n`;
        }

        return [
          `import { defineAsyncComponent } from 'vue';`,
          `import type { Component } from 'vue';`,
          ``,
          `export const demos: Record<string, Component> = {`,
          ...entries,
          `};`,
          ``,
        ].join('\n');
      },
    });

    nuxt.options.alias['#docs/demos'] = resolve(nuxt.options.buildDir, 'docs-demos');

    addTemplate({
      filename: 'docs-demos-types.d.ts',
      write: true,
      getContents: () => `
import type { Component } from 'vue';
declare module '#docs/demos' {
  export const demos: Record<string, Component>;
}
`,
    });
  },
});
