<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { usePointer } from './index';

const area = useTemplateRef<HTMLElement>('area');
const { x, y, pressure, tiltX, tiltY, pointerType, isInside } = usePointer({ target: area });

// Position the crosshair relative to the tracked element.
const dotStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}));

const typeLabel = computed(() => pointerType.value ?? 'none');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      ref="area"
      class="relative h-44 touch-none overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset) [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]"
    >
      <div
        v-if="isInside"
        class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
        :style="dotStyle"
      >
        <div
          class="rounded-full bg-(--accent) opacity-80"
          :style="{ width: `${12 + pressure * 40}px`, height: `${12 + pressure * 40}px` }"
        />
      </div>
      <div class="pointer-events-none absolute inset-0 grid place-items-center">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          {{ isInside ? 'Tracking' : 'Move your pointer here' }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums text-(--fg)">
        <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Position</div>
        <div class="mt-1">{{ Math.round(x) }}, {{ Math.round(y) }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums text-(--fg)">
        <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Pressure</div>
        <div class="mt-1">{{ pressure.toFixed(2) }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums text-(--fg)">
        <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Tilt X / Y</div>
        <div class="mt-1">{{ tiltX }} / {{ tiltY }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Type</div>
        <div class="mt-1 font-mono text-sm capitalize text-(--fg)">{{ typeLabel }}</div>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
      <span class="text-sm text-(--fg-muted)">Pointer inside</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
        :class="isInside
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span class="size-1.5 rounded-full transition" :class="isInside ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
        {{ isInside ? 'Yes' : 'No' }}
      </span>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Pressure scales the dot. Pen tilt &amp; pressure show real values on supporting hardware.
    </p>
  </div>
</template>
