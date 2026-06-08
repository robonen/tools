<script setup lang="ts">
import { computed } from 'vue';
import { useWindowScroll } from './index';

const { x, y, isScrolling, arrivedState, directions, measure } = useWindowScroll({
  behavior: 'smooth',
});

const verticalDirection = computed(() => {
  if (directions.bottom)
    return 'down';
  if (directions.top)
    return 'up';
  return 'idle';
});

function scrollToTop() {
  y.value = 0;
}

function scrollToBottom() {
  // Writing past the max is clamped by the browser, taking us to the bottom.
  y.value = 1_000_000;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Window scroll</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        <span class="size-1.5 rounded-full transition" :class="isScrolling ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'" />
        {{ isScrolling ? 'Scrolling' : 'Idle' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ Math.round(x) }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">scroll x</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ Math.round(y) }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">scroll y</div>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Direction</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ verticalDirection }}
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-(--fg-muted)">Arrived at top</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
            :class="arrivedState.top
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-(--bg-inset) text-(--fg-subtle)'"
          >
            {{ arrivedState.top ? 'yes' : 'no' }}
          </span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-(--fg-muted)">Arrived at bottom</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
            :class="arrivedState.bottom
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-(--bg-inset) text-(--fg-subtle)'"
          >
            {{ arrivedState.bottom ? 'yes' : 'no' }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="arrivedState.top"
        @click="scrollToTop"
      >
        Scroll to top
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="arrivedState.bottom"
        @click="scrollToBottom"
      >
        Scroll to bottom
      </button>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="measure"
    >
      Re-measure
    </button>
    <p class="text-xs text-(--fg-subtle)">
      Scroll the documentation page to watch the position and arrived edges update live.
    </p>
  </div>
</template>
