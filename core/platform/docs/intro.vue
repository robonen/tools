<script setup lang="ts">
// Landing hero for @robonen/platform. Static content only — no runtime APIs are
// touched at setup top-level, so this prerenders and hydrates safely.
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/platform</h1>
      <p>
        Platform-dependent utilities for browser and multi-runtime JavaScript — focus management,
        ARIA isolation, animation lifecycle tracking, and environment-safe globals.
      </p>
    </div>

    <div class="prose-docs">
      <p>
        Most utility libraries stop at the platform boundary: the moment you need to reach for the
        DOM, shadow roots, <code>aria-hidden</code>, or <code>globalThis</code>, you are on your own.
        <strong>@robonen/platform</strong> fills that gap. It packages the gritty, well-tested
        primitives that overlays, dialogs, and editors depend on — focus guards, tabbable-edge
        detection, sibling hiding for screen readers, and CSS animation settling — and ships them
        SSR-aware and dependency-free. It is the low-level layer that powers
        <NuxtLink to="/primitives">@robonen/primitives</NuxtLink> and the editor.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">
          Focus, done right
        </h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Shadow-DOM-aware active-element lookup, scroll-free focusing, and first/last tabbable-edge
          detection via a fast <code class="text-(--accent-text)">TreeWalker</code> — the bones of any focus trap.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">
          Accessible isolation
        </h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          <code class="text-(--accent-text)">hideOthers</code> marks every sibling
          <code class="text-(--accent-text)">aria-hidden</code>, ref-counted across layers, preserving
          <code class="text-(--accent-text)">aria-live</code> regions. A dependency-free port of <code>aria-hidden</code>.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">
          Animation lifecycle
        </h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          Detect running animations and transitions, then settle exit animations cleanly with
          fill-mode flash prevention — so unmounts wait for the CSS to finish.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="text-sm font-semibold text-(--fg)">
          Multi-runtime safe
        </h3>
        <p class="mt-1.5 text-sm text-(--fg-muted)">
          A resolved <code class="text-(--accent-text)">_global</code> and an
          <code class="text-(--accent-text)">isClient</code> flag that work across Node, Bun, Deno, and the
          browser — guards baked in so SSR never throws.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
    </div>

    <DocsCode :code="`pnpm add @robonen/platform`" lang="bash" />

    <div class="prose-docs">
      <h2>Subpath exports</h2>
      <p>
        The package splits along the platform boundary. Browser-only helpers live under
        <code>/browsers</code>; runtime-agnostic helpers live under <code>/multi</code>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Entry</th>
            <th>Scope</th>
            <th>What you get</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>@robonen/platform/browsers</code></td>
            <td>DOM</td>
            <td>Focus, tabbable edges, <code>hideOthers</code>, animation lifecycle</td>
          </tr>
          <tr>
            <td><code>@robonen/platform/multi</code></td>
            <td>Any runtime</td>
            <td><code>_global</code>, <code>isClient</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        A typical overlay flow: capture the focused element, hide siblings from assistive tech, drop
        focus onto the first tabbable target, and tear it all down on close.
      </p>
    </div>

    <DocsCode lang="ts" :code="`import {
  getActiveElement,
  getTabbableEdges,
  focus,
  hideOthers,
} from '@robonen/platform/browsers';

function openDialog(dialog: HTMLElement) {
  // Remember where focus was, so we can restore it on close.
  const previouslyFocused = getActiveElement();

  // Hide everything outside the dialog from screen readers (ref-counted).
  const undoHide = hideOthers(dialog);

  // Move focus to the first tabbable element inside the dialog.
  const { first } = getTabbableEdges(dialog);
  focus(first, { select: true });

  return function close() {
    undoHide();
    focus(previouslyFocused);
  };
}`" />

    <div class="prose-docs">
      <p>
        On the cross-runtime side, reach for a safe global and a reliable client check without
        sprinkling <code>typeof window</code> guards through your code:
      </p>
    </div>

    <DocsCode lang="ts" :code="`import { _global, isClient } from '@robonen/platform/multi';

// Works in Node, Bun, Deno and the browser — never throws in SSR.
if (isClient) {
  _global.addEventListener('resize', onResize);
}`" />

    <div class="rounded-xl border border-(--border) bg-(--bg-subtle) p-4 text-sm text-(--fg-muted)">
      <strong class="text-(--fg)">SSR note:</strong> browser helpers touch the DOM, so call them
      inside event handlers or after mount.
      <code class="text-(--accent-text)">hideOthers</code> already no-ops when <code>document</code> is
      undefined, and <code>/multi</code> is import-safe everywhere.
    </div>

    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>Browse the full API reference below, or jump straight to the building blocks:</p>
      <ul>
        <li><NuxtLink to="/platform/focus-guard">focusGuard</NuxtLink> — add boundary guards for predictable focus wrapping</li>
        <li><NuxtLink to="/platform/get-tabbable-edges">getTabbableEdges</NuxtLink> — find the first and last focusable elements in a container</li>
        <li><NuxtLink to="/platform/hide-others">hideOthers</NuxtLink> — isolate a subtree for assistive technology</li>
        <li><NuxtLink to="/platform/on-animation-settle">onAnimationSettle</NuxtLink> — run a callback once an animation or transition finishes</li>
      </ul>
    </div>
  </div>
</template>
