<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useMouse } from './index';

// Global page coordinates (and whether the input came from mouse or touch).
const { x, y, sourceType } = useMouse();

// Element-relative coordinates via a custom extractor that subtracts the
// target's bounding box, clamped to the box so the dot stays inside.
const area = useTemplateRef<HTMLDivElement>('area');
const { x: relX, y: relY } = useMouse({
  target: area,
  type: (event) => {
    const el = area.value;
    if (!el || !('clientX' in event))
      return null;
    const rect = el.getBoundingClientRect();
    const px = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const py = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return [px, py];
  },
});

const inside = computed(() => relX.value > 0 || relY.value > 0);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">page x</div>
        <div class="mt-1 font-mono text-xl font-bold tabular-nums text-(--fg)">{{ Math.round(x) }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">page y</div>
        <div class="mt-1 font-mono text-xl font-bold tabular-nums text-(--fg)">{{ Math.round(y) }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">source</div>
        <div class="mt-1 font-mono text-xl font-bold tabular-nums text-(--fg)">{{ sourceType ?? '—' }}</div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Move inside this area</span>
      <div
        ref="area"
        class="relative h-40 w-full overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated)"
        style="background-image: radial-gradient(circle, var(--border) 1px, transparent 1px); background-size: 16px 16px;"
      >
        <div
          class="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--accent) bg-(--accent-subtle) transition-opacity"
          :class="inside ? 'opacity-100' : 'opacity-0'"
          :style="{ left: `${relX}px`, top: `${relY}px` }"
        />
        <div
          v-if="inside"
          class="pointer-events-none absolute bottom-2 right-2 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 font-mono text-xs tabular-nums text-(--fg-muted)"
        >
          {{ Math.round(relX) }}, {{ Math.round(relY) }}
        </div>
        <span
          v-else
          class="absolute inset-0 flex items-center justify-center text-sm text-(--fg-subtle)"
        >
          Hover to track relative position
        </span>
      </div>
    </div>
  </div>
</template>
