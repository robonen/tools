<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useScroll } from './index';

const el = useTemplateRef<HTMLElement>('el');

const { x, y, isScrolling, arrivedState, directions } = useScroll(el, {
  throttle: 16,
  offset: { top: 8, bottom: 8 },
});

const items = Array.from({ length: 28 }, (_, i) => ({
  id: i + 1,
  label: [
    'Aurora', 'Basalt', 'Cobalt', 'Driftwood', 'Ember', 'Fjord',
    'Glacier', 'Harbor', 'Indigo', 'Juniper', 'Kelp', 'Lichen',
  ][i % 12],
}));

function scrollToTop() {
  y.value = 0;
}

function scrollToBottom() {
  if (el.value)
    y.value = el.value.scrollHeight;
}

const edges = ['top', 'bottom'] as const;

function arrowFor() {
  if (directions.bottom)
    return '↓';
  if (directions.top)
    return '↑';
  return '·';
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Scroll container</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isScrolling
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="isScrolling ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ isScrolling ? 'scrolling' : 'idle' }}
      </span>
    </div>

    <div
      ref="el"
      class="h-48 overflow-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-2"
    >
      <ul class="flex flex-col gap-1">
        <li
          v-for="item in items"
          :key="item.id"
          class="flex items-center justify-between rounded-lg bg-(--bg-inset) px-3 py-2 text-sm text-(--fg)"
        >
          <span class="font-medium">{{ item.label }}</span>
          <span class="font-mono text-xs text-(--fg-subtle)">#{{ item.id }}</span>
        </li>
      </ul>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex items-center justify-between">
        <span class="text-(--fg-muted)">offset</span>
        <span>x {{ Math.round(x) }} · y {{ Math.round(y) }} {{ arrowFor() }}</span>
      </div>
    </div>

    <div class="flex gap-2">
      <div
        v-for="edge in edges"
        :key="edge"
        class="flex flex-1 flex-col items-center gap-1 rounded-lg border p-2 text-xs transition"
        :class="arrivedState[edge]
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg-subtle)'"
      >
        <span class="font-medium uppercase tracking-wide">{{ edge }}</span>
        <span class="font-mono">{{ arrivedState[edge] ? 'arrived' : '—' }}</span>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="arrivedState.top"
        @click="scrollToTop"
      >
        Scroll to top
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="arrivedState.bottom"
        @click="scrollToBottom"
      >
        Scroll to bottom
      </button>
    </div>
  </div>
</template>
