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
  <div class="demo-stack max-w-sm">
    <div class="grid grid-cols-2 gap-3">
      <div class="demo-card p-4 text-center">
        <p class="demo-label">
          Width
        </p>
        <p class="demo-stat text-3xl">
          {{ width }}
        </p>
        <p class="text-xs text-fg-subtle">
          px
        </p>
      </div>
      <div class="demo-card p-4 text-center">
        <p class="demo-label">
          Height
        </p>
        <p class="demo-stat text-3xl">
          {{ height }}
        </p>
        <p class="text-xs text-fg-subtle">
          px
        </p>
      </div>
    </div>

    <div class="demo-card p-4">
      <div
        class="relative flex items-center justify-center overflow-hidden rounded-lg border border-border-strong bg-bg-inset transition-all"
        :style="{ aspectRatio: `${Math.max(width, 1)} / ${Math.max(height, 1)}` }"
      >
        <div
          class="absolute inset-y-0 left-0 bg-accent-subtle transition-all"
          :style="{ width: `${ratioPercent}%` }"
        />
        <span class="relative font-mono text-xs text-fg-muted tabular-nums">
          {{ width }} × {{ height }}
        </span>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <span class="demo-badge">
        {{ orientation }}
      </span>
      <span class="demo-badge">
        ratio {{ aspect }}
      </span>
    </div>

    <p class="text-center text-xs text-fg-subtle">
      Resize your browser window to watch the values update live.
    </p>
  </div>
</template>
