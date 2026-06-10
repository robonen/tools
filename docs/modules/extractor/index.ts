/**
 * Nuxt module that extracts TypeScript metadata from source packages
 * and provides it as a virtual module `#docs/metadata`.
 *
 * Runs extraction at build start and makes the data available to all
 * pages/components via `import metadata from '#docs/metadata'`.
 */

import { addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import { dirname, resolve } from 'node:path';
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

    // Resolve `@robonen/*` workspace imports (pulled in transitively by demos and
    // doc sections) from SOURCE rather than built `dist/`. Without this the docs
    // build depends on every workspace package being built first — which CI does
    // not guarantee (e.g. a composable importing `@robonen/platform/multi` fails
    // to resolve when platform's dist is absent). Prefix aliases also cover
    // subpath exports (`@robonen/platform/multi` → `core/platform/src/multi`).
    const workspaceSrc: Record<string, string> = {
      '@robonen/stdlib': 'core/stdlib/src',
      '@robonen/platform': 'core/platform/src',
      '@robonen/fetch': 'core/fetch/src',
      '@robonen/encoding': 'core/encoding/src',
      '@robonen/crdt': 'core/crdt/src',
      '@robonen/editor': 'vue/editor/src',
      '@robonen/primitives': 'vue/primitives/src',
      '@robonen/vue': vueSrc,
    };

    nuxt.hook('vite:extendConfig', (config) => {
      // Workspace SOURCE (e.g. @robonen/primitives) references the `__DEV__`
      // compile-time flag (each package defines it in its own vitest/tsdown
      // config). The docs bundle consumes that source directly via the aliases
      // below, so it must define `__DEV__` too — otherwise it throws
      // "ReferenceError: __DEV__ is not defined" at runtime (e.g. in the
      // Primitive `as="template"` / Slot path), silently blanking every demo
      // that hits it. `import.meta.env.DEV` resolves correctly in dev & prod.
      config.define ??= {};
      (config.define as Record<string, unknown>).__DEV__ ??= 'import.meta.env.DEV';

      const existing = config.resolve?.alias;
      const sourceAliases = [
        { find: '@/composables', replacement: resolve(vueSrc, 'composables') },
        { find: '@/types', replacement: resolve(vueSrc, 'types') },
        { find: '@/utils', replacement: resolve(vueSrc, 'utils') },
        ...Object.entries(workspaceSrc).map(([find, rel]) => ({ find, replacement: resolve(ROOT, rel) })),
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
        // Base64-encode the payload (same trick as the Nitro virtual below):
        // build-time text replacements rewrite tokens like `import.meta.client`
        // → `true` even inside string literals, because esbuild re-emits
        // strings with escapes normalized before the replacement plugins run —
        // so code snippets in examples/demo sources can only reach the page
        // verbatim if the module text never contains them. Decoded once at
        // module init; works in the browser, Vue SSR, and prerender.
        const encoded = Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64');

        return `
function decodePayload(encoded: string): string {
  const globalBuffer = (globalThis as { Buffer?: { from: (input: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer;

  if (globalBuffer)
    return globalBuffer.from(encoded, 'base64').toString('utf8');

  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export default JSON.parse(decodePayload(${JSON.stringify(encoded)}));
`;
      },
    });

    // Register the alias for the virtual module
    nuxt.options.alias['#docs/metadata'] = resolve(nuxt.options.buildDir, 'docs-metadata');

    // Expose the same metadata to Nitro so server routes (e.g. the MCP endpoint
    // at `server/routes/mcp.post.ts`) can import it without re-running extraction.
    nuxt.hook('nitro:config', (nitroConfig: { virtual?: Record<string, string | (() => string)> }) => {
      nitroConfig.virtual ??= {};
      // Base64-encode the payload so Nitro's build-time text replacements (e.g.
      // `typeof window` → "undefined") can't corrupt source snippets embedded in
      // the metadata JSON (demo sources, examples, type signatures).
      const encoded = Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64');
      nitroConfig.virtual['#docs/server-metadata'] = () => `export default JSON.parse(Buffer.from(${JSON.stringify(encoded)}, 'base64').toString('utf8'))`;
    });

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

    // Register prerender routes from metadata — one detail route per documented
    // leaf, regardless of package kind (api items / components / guide sections).
    nuxt.hook('prerender:routes', async ({ routes }: { routes: Set<string> }) => {
      if (metadata.packages.length === 0) return;

      for (const pkg of metadata.packages) {
        routes.add(`/${pkg.slug}`);

        // Hand-authored doc sections (any kind). The intro renders on the
        // package landing, so only non-intro sections get their own route.
        for (const section of pkg.docs)
          if (!section.isIntro) routes.add(`/${pkg.slug}/${section.slug}`);

        if (pkg.kind === 'api') {
          for (const category of pkg.categories)
            for (const item of category.items)
              routes.add(`/${pkg.slug}/${item.slug}`);
        }
        else if (pkg.kind === 'components') {
          for (const component of pkg.components)
            routes.add(`/${pkg.slug}/${component.slug}`);
        }
        else if (pkg.kind === 'guide') {
          for (const section of pkg.sections)
            routes.add(`/${pkg.slug}/${section.slug}`);
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
        // An item re-exported from several entry points yields the same key more
        // than once; dedupe so the generated object literal has no duplicate keys.
        const seen = new Set<string>();
        const add = (key: string, demoPath: string) => {
          if (seen.has(key)) return;
          seen.add(key);
          entries.push(`  '${key}': defineAsyncComponent(() => import('${demoPath}')),`);
        };

        for (const pkg of metadata.packages) {
          // api items
          for (const cat of pkg.categories) {
            for (const item of cat.items) {
              if (item.hasDemo) {
                const demoPath = resolve(ROOT, dirname(item.sourcePath), 'demo.vue');
                add(`${pkg.slug}/${item.slug}`, demoPath);
              }
            }
          }
          // component groups
          for (const component of pkg.components) {
            if (component.hasDemo) {
              const demoPath = resolve(ROOT, component.sourcePath, 'demo.vue');
              add(`${pkg.slug}/${component.slug}`, demoPath);
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

    // Lazy demo SOURCE loaders (raw text) — kept out of the metadata payload and
    // fetched only when a user opens "View source", so the ~850KB of demo source
    // never ships in the always-loaded metadata bundle.
    addTemplate({
      filename: 'docs-demo-sources.ts',
      write: true,
      getContents: () => {
        const entries: string[] = [];
        const seen = new Set<string>();
        const add = (key: string, demoPath: string) => {
          if (seen.has(key)) return;
          seen.add(key);
          entries.push(`  '${key}': () => import('${demoPath}?raw').then(m => m.default),`);
        };

        for (const pkg of metadata.packages) {
          for (const cat of pkg.categories)
            for (const item of cat.items)
              if (item.hasDemo) add(`${pkg.slug}/${item.slug}`, resolve(ROOT, dirname(item.sourcePath), 'demo.vue'));
          for (const component of pkg.components)
            if (component.hasDemo) add(`${pkg.slug}/${component.slug}`, resolve(ROOT, component.sourcePath, 'demo.vue'));
        }

        return [
          `export const demoSources: Record<string, () => Promise<string>> = {`,
          ...entries,
          `};`,
          ``,
        ].join('\n');
      },
    });

    nuxt.options.alias['#docs/demo-sources'] = resolve(nuxt.options.buildDir, 'docs-demo-sources');

    addTemplate({
      filename: 'docs-demo-sources-types.d.ts',
      write: true,
      getContents: () => `
declare module '#docs/demo-sources' {
  export const demoSources: Record<string, () => Promise<string>>;
}
`,
    });

    // Generate hand-authored doc-section import map (`<pkg>/docs/*.vue`)
    addTemplate({
      filename: 'docs-sections.ts',
      write: true,
      getContents: () => {
        const entries: string[] = [];
        for (const pkg of metadata.packages) {
          for (const section of pkg.docs) {
            const sectionPath = resolve(ROOT, section.sourcePath);
            entries.push(`  '${pkg.slug}/${section.slug}': defineAsyncComponent(() => import('${sectionPath}')),`);
          }
        }

        if (entries.length === 0) {
          return `import type { Component } from 'vue';\nexport const sections: Record<string, Component> = {};\n`;
        }

        return [
          `import { defineAsyncComponent } from 'vue';`,
          `import type { Component } from 'vue';`,
          ``,
          `export const sections: Record<string, Component> = {`,
          ...entries,
          `};`,
          ``,
        ].join('\n');
      },
    });

    nuxt.options.alias['#docs/sections'] = resolve(nuxt.options.buildDir, 'docs-sections');

    addTemplate({
      filename: 'docs-sections-types.d.ts',
      write: true,
      getContents: () => `
import type { Component } from 'vue';
declare module '#docs/sections' {
  export const sections: Record<string, Component>;
}
`,
    });
  },
});
