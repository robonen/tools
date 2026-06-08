<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useMemory } from './index';

const { isSupported, memory } = useMemory({ interval: 1000 });

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

const usedPercent = computed(() => {
  if (!memory.value)
    return 0;
  return (memory.value.usedJSHeapSize / memory.value.jsHeapSizeLimit) * 100;
});

const allocatedPercent = computed(() => {
  if (!memory.value)
    return 0;
  return (memory.value.totalJSHeapSize / memory.value.jsHeapSizeLimit) * 100;
});

// A button to deliberately allocate memory so the gauge visibly moves.
const ballast = shallowRef<number[][]>([]);
const allocations = ref(0);

function allocate(): void {
  // ~8 MB of doubles per click.
  ballast.value = [...ballast.value, Array.from({ length: 1_000_000 }, (_, i) => i)];
  allocations.value++;
}

function release(): void {
  ballast.value = [];
  allocations.value = 0;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
      <code class="font-mono">performance.memory</code> is not available in this browser (Chromium only).
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">JS heap</span>
          <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ usedPercent.toFixed(1) }}%</span>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
            {{ memory ? formatBytes(memory.usedJSHeapSize) : '—' }}
          </span>
          <span class="text-sm text-(--fg-subtle)">used</span>
        </div>

        <!-- Stacked gauge: allocated under used, both relative to the heap limit -->
        <div class="relative h-2.5 overflow-hidden rounded-full bg-(--bg-inset)">
          <div class="absolute inset-y-0 left-0 bg-(--fg-subtle)/30 transition-[width] duration-500" :style="{ width: `${allocatedPercent}%` }" />
          <div class="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-500" :style="{ width: `${usedPercent}%` }" />
        </div>

        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ memory ? formatBytes(memory.usedJSHeapSize) : '—' }}</div>
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">used</div>
          </div>
          <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ memory ? formatBytes(memory.totalJSHeapSize) : '—' }}</div>
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">total</div>
          </div>
          <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ memory ? formatBytes(memory.jsHeapSizeLimit) : '—' }}</div>
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">limit</div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="allocate"
        >
          Allocate ~8 MB
        </button>
        <button
          type="button"
          :disabled="allocations === 0"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="release"
        >
          Release
        </button>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Sampled every second. Allocate buffers to watch usage climb; releasing lets the next GC reclaim it.
      </p>
    </template>
  </div>
</template>
