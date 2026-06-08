<script setup lang="ts">
// Landing hero for @robonen/renovate. Static content only — no runtime APIs are
// touched at setup top-level, so this prerenders and hydrates safely.

const renovateJson = `{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>robonen/tools//infra/renovate/default.json"]
}`;

const overrideExample = `{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>robonen/tools//infra/renovate/default.json"],
  "packageRules": [
    {
      "matchUpdateTypes": ["major"],
      "automerge": false
    }
  ]
}`;
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/renovate</h1>
      <p class="text-lg text-(--fg-muted)">
        A shared Renovate configuration preset — one line in your
        <code>renovate.json</code> and dependency updates run on autopilot.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Every repository ends up re-deriving the same Renovate setup: which update
        types to auto-merge, when to schedule the noise, how to phrase commit
        messages, who to assign reviews to. <code>@robonen/renovate</code> captures
        those decisions once as a single <code>default.json</code> preset that any
        repo can extend, so the policy lives in one place instead of being copied
        and slowly drifting across projects.
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">One-line adoption</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Extend it via
          <code>github&gt;robonen/tools//infra/renovate/default.json</code>
          — no copy-pasted config, and updates to the policy roll out to every
          consumer.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Quiet by default</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Non-major updates are grouped via <code>group:allNonMajor</code>, so you
          review one consolidated PR instead of a wall of individual bumps.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Hands-off minor &amp; patch</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Minor, patch, pin, and digest updates auto-approve and auto-merge on a
          1–3 AM schedule — safe upgrades land overnight, majors still wait for you.
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-5">
        <h3 class="font-medium text-(--fg) mb-1.5">Conventional commits</h3>
        <p class="text-sm text-(--fg-muted) m-0">
          Every update commits as <code>chore</code> with a
          <code>bump</code> range strategy, and reviews are assigned straight from
          <code>CODEOWNERS</code>.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
      <p>
        You don't import this package in code — Renovate reads it from the repo by
        reference. Add the package to your workspace if you want the bundled
        <code>renovate-config-validator</code> available locally:
      </p>
    </div>
    <DocsCode :code="`pnpm add @robonen/renovate`" lang="bash" />

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        Create (or edit) <code>renovate.json</code> in your repository root and
        extend the preset:
      </p>
    </div>
    <DocsCode :code="renovateJson" lang="json" />

    <div class="prose-docs">
      <p>
        That's the whole setup. To diverge from the shared policy, append your own
        <code>packageRules</code> after the extend — for example, opt out of
        auto-merging major upgrades:
      </p>
    </div>
    <DocsCode :code="overrideExample" lang="json" />

    <div class="rounded-lg border border-(--border) bg-(--bg-subtle) p-4 text-sm text-(--fg-muted)">
      <strong class="text-(--fg)">Tip:</strong> validate any config that extends
      this preset with
      <code class="text-(--accent-text)">renovate-config-validator</code> before
      committing — the package ships it as a <code>test</code> script against
      <code>default.json</code>.
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-elevated) p-5">
      <h3 class="font-medium text-(--fg) mb-2">Where to next</h3>
      <ul class="text-sm text-(--fg-muted) space-y-1.5 list-disc pl-5 m-0">
        <li>
          Read the guide sections below for the full list of what the preset
          enables — extended configs, schedules, and package rules.
        </li>
        <li>
          See the upstream
          <a href="https://docs.renovatebot.com/" class="text-(--accent-text) hover:underline" target="_blank" rel="noreferrer">Renovate docs</a>
          for the complete configuration schema you can layer on top.
        </li>
      </ul>
    </div>
  </div>
</template>
