<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useMouseInElement } from './index';

const area = useTemplateRef<HTMLElement>('area');

const {
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  isOutside,
} = useMouseInElement(area);

// Clamp to the element so the readout/spotlight stay sane at the edges.
const clampedX = computed(() => Math.max(0, Math.min(elementX.value, elementWidth.value)));
const clampedY = computed(() => Math.max(0, Math.min(elementY.value, elementHeight.value)));

const percentX = computed(() => elementWidth.value ? Math.round((clampedX.value / elementWidth.value) * 100) : 0);
const percentY = computed(() => elementHeight.value ? Math.round((clampedY.value / elementHeight.value) * 100) : 0);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      ref="area"
      class="relative h-44 w-full overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset) transition-colors"
      :class="isOutside ? 'border-(--border)' : 'border-(--accent)'"
    >
      <!-- Spotlight that follows the cursor -->
      <div
        class="pointer-events-none absolute size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--accent)/15 blur-xl transition-opacity duration-200"
        :class="isOutside ? 'opacity-0' : 'opacity-100'"
        :style="{ left: `${clampedX}px`, top: `${clampedY}px` }"
      />

      <!-- Crosshair dot -->
      <div
        class="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--accent-fg) bg-(--accent) transition-opacity duration-150"
        :class="isOutside ? 'opacity-0' : 'opacity-100'"
        :style="{ left: `${clampedX}px`, top: `${clampedY}px` }"
      />

      <span
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-(--fg-subtle) transition-opacity"
        :class="isOutside ? 'opacity-100' : 'opacity-0'"
      >
        Move your cursor here
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">elementX</p>
        <p class="mt-1 font-mono text-lg font-bold tabular-nums text-(--fg)">{{ Math.round(clampedX) }}<span class="text-sm font-normal text-(--fg-subtle)">px</span></p>
        <p class="mt-0.5 text-xs text-(--fg-muted) tabular-nums">{{ percentX }}%</p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">elementY</p>
        <p class="mt-1 font-mono text-lg font-bold tabular-nums text-(--fg)">{{ Math.round(clampedY) }}<span class="text-sm font-normal text-(--fg-subtle)">px</span></p>
        <p class="mt-0.5 text-xs text-(--fg-muted) tabular-nums">{{ percentY }}%</p>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
      <span class="text-sm text-(--fg-muted)">Cursor</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
        :class="isOutside
          ? 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
      >
        <span class="size-1.5 rounded-full" :class="isOutside ? 'bg-(--fg-subtle)' : 'bg-emerald-500'" />
        {{ isOutside ? 'Outside' : 'Inside' }}
      </span>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Coordinates are relative to the box's top-left corner &mdash; observed via <code class="font-mono">useElementBounding</code>, so they stay correct as it moves or resizes.
    </p>
  </div>
</template>
