<script setup lang="ts">
const nodeExample = `// Node / isomorphic library
{ "extends": "@robonen/tsconfig/tsconfig.base.json" }`;

const vueExample = `// Vue package, with path aliases
{
  "extends": "@robonen/tsconfig/tsconfig.vue.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}`;

const splitExample = `// tsconfig.json — solution root
{
  "files": [],
  "references": [
    { "path": "./tsconfig.src.json" },  // extends tsconfig.dom.json
    { "path": "./tsconfig.node.json" }  // *.config.ts, types: ["node"]
  ]
}`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/tsconfig</h1>
      <p class="text-lg text-(--fg-muted)">
        Shared, strict TypeScript configurations — a small set of layered
        presets you extend instead of copying compiler options between packages.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Every package in a monorepo wants the same modern, strict TypeScript
        baseline, but keeping a dozen <code>tsconfig.json</code> files in sync by
        hand drifts almost immediately. <code>@robonen/tsconfig</code> ships one
        carefully tuned <code>base</code> config and three environment layers
        — <code>dom</code>, <code>vue</code>, and <code>node</code> — that extend
        it. Point your package's <code>extends</code> at the right preset and you
        inherit a consistent, bundler-first, type-check-only setup with no local
        compiler options to maintain.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Layered presets</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>base</code> &rarr; <code>dom</code> &rarr; <code>vue</code>, plus
          a sibling <code>node</code> layer. Extend the one that matches the
          environment; everything else is inherited.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Strict by default</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>strict</code> plus <code>noUncheckedIndexedAccess</code>,
          <code>noImplicitOverride</code>, <code>noImplicitReturns</code> and
          <code>noFallthroughCasesInSwitch</code> are on out of the box.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Bundler-first</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          <code>module: Preserve</code> with <code>Bundler</code> resolution,
          <code>verbatimModuleSyntax</code> and <code>isolatedModules</code>.
          Emit is <code>noEmit</code> — declarations come from
          <code>tsdown</code>.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Env isolation</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Browser <code>src</code> (DOM, no Node globals) and tooling files
          (<code>node</code> types, no DOM) split into separate projects wired
          with project references.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
      <p>
        Add the package as a dev dependency. It ships only JSON presets — no
        runtime code.
      </p>
    </div>
    <DocsCode :code="`pnpm add -D @robonen/tsconfig`" lang="bash" />

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        Pick the preset that matches the package and extend it from your
        <code>tsconfig.json</code>:
      </p>
    </div>
    <DocsCode :code="nodeExample" lang="json" />

    <div class="prose-docs">
      <p>
        Vue SFC packages extend the <code>vue</code> layer (adds
        <code>jsx: preserve</code> and strict
        <code>vueCompilerOptions</code>) and can declare path aliases inline:
      </p>
    </div>
    <DocsCode :code="vueExample" lang="json" />

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-4">
      <p class="text-sm text-(--fg-muted) m-0">
        <strong class="text-(--fg)">Note:</strong> path aliases resolve relative
        to the <code class="text-(--fg)">tsconfig.json</code> location —
        <code class="text-(--fg)">baseUrl</code> is intentionally omitted
        (deprecated, removed in TypeScript 7.0).
      </p>
    </div>

    <div class="prose-docs">
      <h2>DOM + Node split</h2>
      <p>
        Most packages mix browser <code>src</code> with Node tooling files
        (<code>vite.config.ts</code>, <code>vitest.config.ts</code>,
        <code>tsdown.config.ts</code>). Split them into two projects wired with
        references so <code>src</code> never sees Node globals and config files
        never see <code>DOM</code>, then type-check the whole package with
        <code>tsc -b</code> / <code>vue-tsc -b</code>:
      </p>
    </div>
    <DocsCode :code="splitExample" lang="json" />

    <div class="rounded-lg border border-(--border) bg-(--bg-elevated) p-5">
      <h3 class="font-medium text-(--fg) mb-2">Where to next</h3>
      <ul class="text-sm text-(--fg-muted) space-y-1.5 list-disc pl-5 m-0">
        <li>
          <strong class="text-(--fg)">Presets</strong> — the full table of
          <code>base</code>, <code>dom</code>, <code>vue</code> and
          <code>node</code>, with what each layer adds.
        </li>
        <li>
          <strong class="text-(--fg)">Project references</strong> — the complete
          DOM + Node split with <code>composite</code> and
          <code>tsBuildInfoFile</code> wiring.
        </li>
        <li>
          <strong class="text-(--fg)">What's included</strong> — the exact
          compiler options the <code>base</code> preset turns on.
        </li>
        <li>
          See the guide sections in the sidebar for each of the above.
        </li>
      </ul>
    </div>
  </div>
</template>
