<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useVirtualList } from './index';

// 10,000 rows — only the visible window (plus overscan) is ever in the DOM.
const total = 10000;
const items = shallowRef(
  Array.from({ length: total }, (_, i) => ({
    id: i,
    label: `Row #${(i + 1).toString().padStart(5, '0')}`,
    hue: (i * 37) % 360,
  })),
);

const itemHeight = 44;

const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(items, {
  itemHeight,
  overscan: 6,
});

const jumpTo = ref(5000);

function go() {
  const index = Math.min(Math.max(jumpTo.value || 0, 0), total - 1);
  scrollTo(index, { behavior: 'smooth', block: 'center' });
}

const visibleRange = computed(() => {
  if (list.value.length === 0)
    return '—';
  const first = list.value[0]!.index;
  const last = list.value[list.value.length - 1]!.index;
  return `${first}–${last}`;
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Virtual list</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ total.toLocaleString() }} rows
      </span>
    </div>

    <div
      v-bind="containerProps"
      class="h-64 rounded-xl border border-(--border) bg-(--bg-elevated)"
    >
      <div v-bind="wrapperProps">
        <div
          v-for="{ data, index } in list"
          :key="index"
          class="flex items-center gap-3 border-b border-(--border) px-3"
          :style="{ height: `${itemHeight}px` }"
        >
          <span
            class="size-6 shrink-0 rounded-md border border-(--border)"
            :style="{ backgroundColor: `hsl(${data.hue} 65% 55%)` }"
          />
          <span class="flex-1 truncate font-mono text-sm text-(--fg) tabular-nums">{{ data.label }}</span>
          <span class="text-xs text-(--fg-subtle)">idx {{ index }}</span>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums flex items-center justify-between">
      <span class="text-(--fg-muted)">rendered</span>
      <span>{{ list.length }} nodes · idx {{ visibleRange }}</span>
    </div>

    <div class="flex items-end gap-2">
      <label class="flex flex-1 flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Scroll to index</span>
        <input
          v-model.number="jumpTo"
          type="number"
          :min="0"
          :max="total - 1"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="go"
      >
        Jump
      </button>
    </div>
  </div>
</template>
