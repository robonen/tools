<script setup lang="ts">
const usageExample = `import { compose, base, typescript, vue, vitest, imports } from '@robonen/eslint';

// eslint.config.ts
export default compose(base, typescript, vue, vitest, imports);`;

const overrideExample = `import { compose, base, typescript } from '@robonen/eslint';

export default compose(base, typescript, {
  // later entries override earlier ones
  rules: { 'no-console': 'off' },
});`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/eslint</h1>
      <p class="text-lg text-(--fg-muted)">
        Composable ESLint flat-config presets — assemble a linting setup from
        small, focused building blocks instead of one monolithic config.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Modern ESLint flat config is just an ordered array of config objects, but
        wiring up plugins, parsers, and rule sets by hand is repetitive and easy
        to get wrong. <code>@robonen/eslint</code> ships a curated set of presets
        — <code>base</code>, <code>typescript</code>, <code>vue</code>,
        <code>vitest</code>, <code>imports</code>, <code>node</code>,
        <code>regexp</code>, and <code>stylistic</code> — and a single
        <code>compose()</code> helper that flattens them into one config array.
        Pick the presets your project needs, layer your own overrides on top, and
        you have a consistent, type-safe lint setup in a few lines.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Composable presets</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Mix and match focused presets per language and tool. Each preset is a
          plain flat-config array — no magic, no hidden state.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Override-friendly</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Append inline config objects after presets. Later entries win, exactly
          as ESLint flat-config semantics intend.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Conditional by design</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>compose()</code> skips <code>false</code>/<code>null</code>/<code>undefined</code>
          entries, so feature flags and conditional spreads just work.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Typed flat config</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Exported <code>FlatConfig</code> and <code>Rules</code> types give you
          editor autocomplete and type-checked overrides in
          <code>eslint.config.ts</code>.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
      <p>
        Install the package alongside ESLint and <code>jiti</code> (so ESLint can
        load a TypeScript <code>eslint.config.ts</code>).
      </p>
    </div>
    <DocsCode :code="`pnpm add -D @robonen/eslint eslint jiti`" lang="bash" />

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        Create <code>eslint.config.ts</code> in your project root and compose the
        presets you want:
      </p>
    </div>
    <DocsCode :code="usageExample" lang="ts" />

    <div class="prose-docs">
      <p>
        Add inline config objects after the presets to tweak rules — later
        entries override earlier ones:
      </p>
    </div>
    <DocsCode :code="overrideExample" lang="ts" />

    <div class="rounded-lg border border-(--border) bg-(--bg-elevated) p-5">
      <h3 class="font-medium text-(--fg) mb-2">Where to next</h3>
      <ul class="text-sm text-(--fg-muted) space-y-1.5 list-disc pl-5 m-0">
        <li>
          <NuxtLink to="/eslint/overview" class="text-(--accent-text) hover:underline">compose</NuxtLink>
          — flatten presets and overrides into one config array.
        </li>
        <li>
          <NuxtLink to="/eslint/base" class="text-(--accent-text) hover:underline">base</NuxtLink>
          — core ESLint, unicorn, regexp rules and global ignores.
        </li>
        <li>
          <NuxtLink to="/eslint/typescript" class="text-(--accent-text) hover:underline">typescript</NuxtLink>
          and
          <NuxtLink to="/eslint/vue" class="text-(--accent-text) hover:underline">vue</NuxtLink>
          — language presets for TS and Vue 3 SFCs.
        </li>
        <li>
          Read the guide sections below for the full preset table and migration
          notes from <code>@robonen/oxlint</code>.
        </li>
      </ul>
    </div>
  </div>
</template>
