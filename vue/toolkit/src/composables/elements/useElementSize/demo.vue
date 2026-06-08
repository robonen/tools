<script setup lang="ts">
import { ref } from 'vue';
import { useElementSize } from './index';

const target = ref<HTMLElement>();

// content-box vs border-box is the headline option, so observe it directly.
const { width, height, stop } = useElementSize(target, { width: 0, height: 0 }, { box: 'border-box' });

const padding = ref(16);
const observing = ref(true);

function toggleObserver() {
  if (observing.value) {
    stop();
    observing.value = false;
  }
  // Re-observing requires a fresh composable instance; keep the demo honest by
  // only offering "stop" once and noting it below.
}

function fmt(n: number) {
  return n.toFixed(0);
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">ResizeObserver</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          <span class="size-1.5 rounded-full" :class="observing ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ observing ? 'Observing' : 'Stopped' }}
        </span>
      </div>

      <!-- Native textarea resize handle makes the element user-resizable. -->
      <textarea
        ref="target"
        readonly
        :style="{ padding: `${padding}px` }"
        class="w-full min-h-24 resize rounded-lg border border-(--border-strong) bg-(--bg-inset) text-sm leading-relaxed text-(--fg-muted) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >Drag the bottom-right corner to resize me. The width and height update live as the ResizeObserver fires. Border-box sizing includes the padding below.</textarea>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
          <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ fmt(width) }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">width px</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
          <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ fmt(height) }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">height px</div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="size-padding">Padding (border-box)</label>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ padding }}px</span>
      </div>
      <input
        id="size-padding"
        v-model.number="padding"
        type="range"
        min="0"
        max="40"
        step="2"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      :disabled="!observing"
      @click="toggleObserver"
    >
      {{ observing ? 'Stop observing' : 'Observer stopped' }}
    </button>

    <p class="text-xs text-(--fg-subtle)">
      With <span class="font-mono">box: 'border-box'</span> the reported size includes padding, so the slider changes the numbers without resizing the element.
    </p>
  </div>
</template>
