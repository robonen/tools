<script setup lang="ts">
import { computed, ref } from 'vue';
import { useElementBounding } from './index';

type Timing = 'sync' | 'next-frame';

const timing = ref<Timing>('sync');

const target = ref<HTMLElement>();

// Two independent measurers so toggling the timing mode is visible live.
const sync = useElementBounding(target, { updateTiming: 'sync' });
const nextFrame = useElementBounding(target, { updateTiming: 'next-frame' });

const bounds = computed(() => (timing.value === 'sync' ? sync : nextFrame));

// Resizable, draggable-ish target driven by sliders so every field updates live.
const size = ref(56);

const metrics = computed(() => [
  { label: 'width', value: bounds.value.width.value },
  { label: 'height', value: bounds.value.height.value },
  { label: 'top', value: bounds.value.top.value },
  { label: 'left', value: bounds.value.left.value },
  { label: 'right', value: bounds.value.right.value },
  { label: 'bottom', value: bounds.value.bottom.value },
  { label: 'x', value: bounds.value.x.value },
  { label: 'y', value: bounds.value.y.value },
]);

function fmt(n: number) {
  return Math.round(n);
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">getBoundingClientRect</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ timing }}
        </span>
      </div>

      <!-- The measured target. Resizing it mutates the reactive bounds. -->
      <div class="relative h-40 overflow-hidden rounded-lg border border-(--border) bg-(--bg-inset)">
        <div
          ref="target"
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-lg bg-(--accent) text-(--accent-fg) shadow transition-[width,height] duration-150"
          :style="{ width: `${size}px`, height: `${size}px` }"
        >
          <span class="font-mono text-xs font-semibold tabular-nums">{{ fmt(bounds.width.value) }}×{{ fmt(bounds.height.value) }}</span>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="m in metrics"
          :key="m.label"
          class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center"
        >
          <div class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ fmt(m.value) }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="bound-size">Size</label>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ size }}px</span>
      </div>
      <input
        id="bound-size"
        v-model.number="size"
        type="range"
        min="32"
        max="140"
        step="2"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </div>

    <div class="flex items-center gap-2">
      <button
        v-for="opt in (['sync', 'next-frame'] as Timing[])"
        :key="opt"
        type="button"
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="timing === opt
          ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
        @click="timing = opt"
      >
        {{ opt }}
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="bounds.update()"
      >
        Update
      </button>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      <span class="font-mono">next-frame</span> batches rapid scroll/resize reads into one measurement per animation frame.
    </p>
  </div>
</template>
