<script setup lang="ts">
const usageExample = `import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';

export default defineConfig({
  ...sharedConfig,
  tsconfig: './tsconfig.src.json',
  entry: ['src/index.ts'],
});`;

const overrideExample = `import { defineConfig } from 'tsdown';
import { sharedConfig } from '@robonen/tsdown';
import Vue from 'unplugin-vue/rolldown';

export default defineConfig({
  ...sharedConfig,
  entry: ['src/index.ts', 'src/*/index.ts'],
  plugins: [Vue({ isProduction: true })],
  // layer on top of the shared defaults
  dts: { vue: true },
});`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/tsdown</h1>
      <p class="text-lg text-(--fg-muted)">
        Shared tsdown build configuration for every <code>@robonen</code>
        package — one source of truth for output formats, declarations, and
        bundle hygiene.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Every library in this monorepo ships dual ESM/CJS builds with type
        declarations, a clean <code>dist</code>, and a consistent license
        banner. Re-declaring that in each package's
        <code>tsdown.config.ts</code> is repetitive and drifts over time.
        <code>@robonen/tsdown</code> exports a single
        <code>sharedConfig</code> object you spread into
        <code>defineConfig</code>, then add only what is package-specific —
        usually just <code>entry</code> and <code>tsconfig</code>.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Dual ESM + CJS</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Emits both <code>esm</code> and <code>cjs</code> formats so packages
          work in modern bundlers and legacy <code>require</code> setups alike.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Types included</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>dts: true</code> generates <code>.d.ts</code> declarations on
          every build — no separate type pipeline to maintain.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Clean, stable output</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>clean: true</code> wipes <code>dist</code> first and
          <code>hash: false</code> keeps file names deterministic for
          predictable publishing.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Spread &amp; override</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          It is a plain object typed as <code>InlineConfig</code> — spread it,
          override any field, and let editor autocomplete guide you.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
      <p>
        Add the config package and <code>tsdown</code> itself as dev
        dependencies:
      </p>
    </div>
    <DocsCode :code="`pnpm add -D @robonen/tsdown tsdown`" lang="bash" />

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        Create <code>tsdown.config.ts</code> in your package, spread
        <code>sharedConfig</code>, and supply your entry points:
      </p>
    </div>
    <DocsCode :code="usageExample" lang="ts" />

    <div class="prose-docs">
      <p>
        Because <code>sharedConfig</code> is a normal object, you can override
        or extend any field after spreading — add plugins, extra entries, or
        tweak the declaration options:
      </p>
    </div>
    <DocsCode :code="overrideExample" lang="ts" />

    <div class="rounded-lg border border-(--border) bg-(--bg-elevated) p-5">
      <h3 class="font-medium text-(--fg) mb-2">Where to next</h3>
      <ul class="text-sm text-(--fg-muted) space-y-1.5 list-disc pl-5 m-0">
        <li>
          <NuxtLink to="/tsdown/overview" class="text-(--accent-text) hover:underline">sharedConfig</NuxtLink>
          — the full list of defaults and their exact values.
        </li>
        <li>
          Read the guide sections below for the conventions baked into the
          shared build and tips for package-specific overrides.
        </li>
      </ul>
    </div>
  </div>
</template>
