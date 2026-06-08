<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref } from 'vue';
import { useFps } from './index';

const { fps, min, max, isActive, reset, pause, resume } = useFps({ every: 10 });

// Optional artificial load so the FPS reading visibly reacts.
const stress = ref(0);
let raf = 0;

function burn() {
  if (stress.value > 0) {
    const end = performance.now() + stress.value;
    // Busy-wait to simulate a heavy frame and depress FPS.
    while (performance.now() < end) { /* spin */ }
  }
  raf = requestAnimationFrame(burn);
}
// Client-only: requestAnimationFrame is undefined during SSR/prerender.
onMounted(() => { raf = requestAnimationFrame(burn); });
onScopeDispose(() => cancelAnimationFrame(raf));

const health = computed(() => {
  if (fps.value >= 55)
    return { label: 'Smooth', cls: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' };
  if (fps.value >= 30)
    return { label: 'Choppy', cls: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
  return { label: 'Janky', cls: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' };
});

const barWidth = computed(() => `${Math.min(100, (fps.value / 60) * 100)}%`);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Frames / second
        </span>
        <span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="health.cls">
          <span class="size-1.5 rounded-full" :class="health.dot" />
          {{ health.label }}
        </span>
      </div>

      <div class="mt-1 flex items-baseline gap-2">
        <span class="font-mono text-4xl font-bold tabular-nums text-(--fg)">{{ fps }}</span>
        <span class="text-sm text-(--fg-subtle)">fps</span>
      </div>

      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-(--bg-inset)">
        <div
          class="h-full rounded-full transition-[width] duration-150"
          :class="health.dot"
          :style="{ width: barWidth }"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Min</div>
        <div class="font-mono text-xl font-bold tabular-nums text-(--fg)">
          {{ Number.isFinite(min) ? min : '—' }}
        </div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Max</div>
        <div class="font-mono text-xl font-bold tabular-nums text-(--fg)">{{ max }}</div>
      </div>
    </div>

    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-xs">
        <span class="font-medium uppercase tracking-wide text-(--fg-subtle)">Simulated load</span>
        <span class="font-mono tabular-nums text-(--fg-muted)">{{ stress }} ms/frame</span>
      </div>
      <input
        v-model.number="stress"
        type="range"
        min="0"
        max="40"
        step="2"
        class="w-full accent-(--accent)"
      >
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="isActive ? pause() : resume()"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="reset"
      >
        Reset min / max
      </button>
    </div>
  </div>
</template>
