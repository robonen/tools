<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@robonen/primitives';

const releases = [
  { tag: 'v2.4.0', date: '2026-05-28', note: 'Headless scroll-area lands with custom scrollbars and RTL support.' },
  { tag: 'v2.3.1', date: '2026-05-12', note: 'Fix thumb drag jitter when the viewport resizes mid-gesture.' },
  { tag: 'v2.3.0', date: '2026-04-30', note: 'New combobox primitive and improved focus-scope teleporting.' },
  { tag: 'v2.2.2', date: '2026-04-18', note: 'Patch aria-controls wiring between scrollbar and viewport.' },
  { tag: 'v2.2.1', date: '2026-04-02', note: 'Reduce layout thrash in the resize observer fast path.' },
  { tag: 'v2.2.0', date: '2026-03-21', note: 'Date-picker range mode plus calendar keyboard navigation.' },
  { tag: 'v2.1.0', date: '2026-03-05', note: 'Toast region stacking and swipe-to-dismiss gestures.' },
  { tag: 'v2.0.0', date: '2026-02-14', note: 'Major: tree-shakeable barrel exports and stricter prop types.' },
];
</script>

<template>
  <ScrollAreaRoot
    type="always"
    class="h-64 w-full max-w-md overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated) text-(--fg)"
  >
    <ScrollAreaViewport class="h-full w-full">
      <div class="border-b border-(--border) px-4 py-3">
        <h3 class="text-sm font-semibold">
          Changelog
        </h3>
        <p class="text-xs text-(--fg-subtle)">
          @robonen/primitives
        </p>
      </div>

      <ul class="divide-y divide-(--border)">
        <li
          v-for="release in releases"
          :key="release.tag"
          class="flex gap-3 whitespace-nowrap px-4 py-3"
        >
          <span class="inline-flex h-fit shrink-0 items-center rounded-md border border-(--border) bg-(--bg-subtle) px-2 py-0.5 font-mono text-xs text-(--accent)">
            {{ release.tag }}
          </span>
          <div class="min-w-0">
            <p class="text-sm text-(--fg)">
              {{ release.note }}
            </p>
            <p class="mt-0.5 text-xs text-(--fg-subtle)">
              {{ release.date }}
            </p>
          </div>
        </li>
      </ul>
    </ScrollAreaViewport>

    <ScrollAreaScrollbar
      orientation="vertical"
      class="flex w-2.5 touch-none select-none bg-(--bg-inset) p-0.5 transition-colors hover:bg-(--bg-subtle)"
    >
      <ScrollAreaThumb class="flex-1 rounded-full bg-(--fg-subtle) transition-colors hover:bg-(--fg-muted)" />
    </ScrollAreaScrollbar>

    <ScrollAreaScrollbar
      orientation="horizontal"
      class="flex h-2.5 flex-col touch-none select-none bg-(--bg-inset) p-0.5 transition-colors hover:bg-(--bg-subtle)"
    >
      <ScrollAreaThumb class="flex-1 rounded-full bg-(--fg-subtle) transition-colors hover:bg-(--fg-muted)" />
    </ScrollAreaScrollbar>

    <ScrollAreaCorner class="bg-(--bg-inset)" />
  </ScrollAreaRoot>
</template>
