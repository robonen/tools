<script setup lang="ts">
// Landing hero for @robonen/primitives. Static content only — no runtime
// logic at setup top-level, so it prerenders and hydrates cleanly.
</script>

<template>
  <div class="docs-section">
    <div class="prose-docs">
      <h1>@robonen/primitives</h1>
      <p>
        A collection of unstyled, accessible UI primitives for Vue 3 — the headless
        building blocks for design systems and component libraries.
      </p>
    </div>

    <p class="prose-docs">
      Most component libraries bundle behavior and styling together, so the moment
      your design diverges you end up fighting the framework. <code>@robonen/primitives</code>
      ships the hard part — state, focus management, keyboard interaction, ARIA wiring,
      portalling and positioning — and leaves the markup and styling entirely to you.
      Every primitive is composed from small, controllable parts (a <code>Root</code>,
      a <code>Trigger</code>, a <code>Content</code>, and so on) following the same
      conventions, so once you learn one you know them all.
    </p>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="m-0 text-sm font-semibold text-(--fg)">Unstyled by design</h3>
        <p class="mt-2 mb-0 text-sm text-(--fg-muted)">
          No CSS shipped. Primitives render the DOM you ask for and expose state via
          data attributes, so you bring your own styles — Tailwind, vanilla CSS, anything.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="m-0 text-sm font-semibold text-(--fg)">Accessible out of the box</h3>
        <p class="mt-2 mb-0 text-sm text-(--fg-muted)">
          Focus scopes, roving tabindex, visually-hidden labels and correct ARIA roles
          are handled for you. The suite is tested against
          <code>axe-core</code> in a real browser.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="m-0 text-sm font-semibold text-(--fg)">Controlled or uncontrolled</h3>
        <p class="mt-2 mb-0 text-sm text-(--fg-muted)">
          Bind state with <code>v-model</code> when you need control, or set a
          <code>defaultValue</code> / <code>defaultOpen</code> and let the primitive
          manage itself.
        </p>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-5">
        <h3 class="m-0 text-sm font-semibold text-(--fg)">Composable & polymorphic</h3>
        <p class="mt-2 mb-0 text-sm text-(--fg-muted)">
          Every part takes an <code>as</code> prop, or use <code>as="template"</code>
          to merge behavior onto your own element. Floating UI powers positioning for
          popovers, tooltips and menus.
        </p>
      </div>
    </div>

    <div class="prose-docs">
      <h2>Install</h2>
    </div>

    <DocsCode :code="`pnpm add @robonen/primitives`" lang="bash" />

    <div class="prose-docs">
      <h2>Usage</h2>
      <p>
        Primitives are assembled from named parts. Here is a complete dialog — open
        state is uncontrolled, focus is trapped, body scroll is locked, and the
        content is portalled out of the DOM flow:
      </p>
    </div>

    <DocsCode lang="vue" :code="`<script setup lang=&quot;ts&quot;>
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@robonen/primitives';
</scr&shy;ipt>

<template>
  <DialogRoot>
    <DialogTrigger class=&quot;btn&quot;>Open</DialogTrigger>

    <DialogPortal>
      <DialogOverlay class=&quot;overlay&quot; />
      <DialogContent class=&quot;dialog&quot;>
        <DialogTitle>Delete project</DialogTitle>
        <DialogDescription>This action cannot be undone.</DialogDescription>
        <DialogClose class=&quot;btn&quot;>Cancel</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>`" />

    <div class="prose-docs">
      <p>
        Need full control over open state? Bind it directly — the same primitive works
        either way:
      </p>
    </div>

    <DocsCode lang="vue" :code="`<DialogRoot v-model:open=&quot;isOpen&quot;>
  <!-- ... -->
</DialogRoot>`" />

    <div class="prose-docs">
      <h2>The Primitive component</h2>
      <p>
        At the core of every part is <code>Primitive</code>, a polymorphic functional
        component. Pass <code>as</code> to choose the element, or <code>as="template"</code>
        to forward behavior onto a child of your own.
      </p>
    </div>

    <DocsCode lang="ts" :code="`import { Primitive, Slot } from '@robonen/primitives';

// <Primitive as=&quot;button&quot; /> renders a <button>
// <Primitive as=&quot;template&quot;> merges props onto the slotted child`" />

    <div class="prose-docs">
      <h2>Where to next</h2>
      <p>
        The full primitive index is listed below. A few good starting points:
      </p>
      <ul>
        <li><NuxtLink to="/primitives/dialog">Dialog</NuxtLink> and <NuxtLink to="/primitives/alert-dialog">Alert Dialog</NuxtLink> — modal layers with focus trapping.</li>
        <li><NuxtLink to="/primitives/popover">Popover</NuxtLink>, <NuxtLink to="/primitives/tooltip">Tooltip</NuxtLink> and <NuxtLink to="/primitives/hover-card">Hover Card</NuxtLink> — Floating UI positioned surfaces.</li>
        <li><NuxtLink to="/primitives/select">Select</NuxtLink>, <NuxtLink to="/primitives/combobox">Combobox</NuxtLink> and <NuxtLink to="/primitives/listbox">Listbox</NuxtLink> — keyboard-driven option pickers.</li>
        <li><NuxtLink to="/primitives/switch">Switch</NuxtLink>, <NuxtLink to="/primitives/checkbox">Checkbox</NuxtLink> and <NuxtLink to="/primitives/slider">Slider</NuxtLink> — form controls that integrate with native inputs.</li>
        <li><NuxtLink to="/primitives/focus-scope">Focus Scope</NuxtLink> and <NuxtLink to="/primitives/presence">Presence</NuxtLink> — the shared foundations every part builds on.</li>
      </ul>
    </div>
  </div>
</template>
