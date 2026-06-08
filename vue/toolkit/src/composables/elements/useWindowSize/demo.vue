<script setup lang="ts">
import { computed } from 'vue';
import { useWindowSize } from './index';

const { width, height } = useWindowSize();

const orientation = computed(() => (width.value >= height.value ? 'landscape' : 'portrait'));
const aspect = computed(() => (height.value === 0 ? '–' : (width.value / height.value).toFixed(2)));
const ratioPercent = computed(() => {
  const total = width.value + height.value;
  return total === 0 ? 50 : Math.round((width.value / total) * 100);
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-center">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Width
        </p>
        <p class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ width }}
        </p>
        <p class="text-xs text-(--fg-subtle)">
          px
        </p>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-center">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Height
        </p>
        <p class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ height }}
        </p>
        <p class="text-xs text-(--fg-subtle)">
          px
        </p>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div
        class="relative flex items-center justify-center overflow-hidden rounded-lg border border-(--border-strong) bg-(--bg-inset) transition-all"
        :style="{ aspectRatio: `${Math.max(width, 1)} / ${Math.max(height, 1)}` }"
      >
        <div
          class="absolute inset-y-0 left-0 bg-(--accent-subtle) transition-all"
          :style="{ width: `${ratioPercent}%` }"
        />
        <span class="relative font-mono text-xs text-(--fg-muted) tabular-nums">
          {{ width }} × {{ height }}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ orientation }}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        ratio {{ aspect }}
      </span>
    </div>

    <p class="text-center text-xs text-(--fg-subtle)">
      Resize your browser window to watch the values update live.
    </p>
  </div>
</template>
