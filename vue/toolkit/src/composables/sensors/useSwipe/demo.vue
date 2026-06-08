<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useSwipe } from './index';

const el = useTemplateRef<HTMLElement>('el');

const lastDirection = ref<'up' | 'down' | 'left' | 'right' | 'none'>('none');

const { isSwiping, direction, lengthX, lengthY, coordsStart, coordsEnd } = useSwipe(el, {
  passive: false,
  threshold: 40,
  onSwipeEnd(_event, dir) {
    lastDirection.value = dir;
  },
});

// Live drag offset while actively swiping, clamped so the card stays in view.
const offsetX = computed(() => (isSwiping.value ? Math.max(-80, Math.min(80, lengthX.value)) : 0));
const offsetY = computed(() => (isSwiping.value ? Math.max(-40, Math.min(40, lengthY.value)) : 0));

const arrows: Record<string, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  none: '·',
};
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Swipe area (touch / drag)</span>

    <div
      ref="el"
      class="relative flex h-40 touch-none select-none items-center justify-center overflow-hidden rounded-xl border border-(--border-strong) bg-(--bg-inset)"
    >
      <div
        class="flex flex-col items-center gap-1 rounded-lg border border-(--border) bg-(--bg-elevated) px-6 py-4 shadow-sm"
        :class="isSwiping ? 'transition-none' : 'transition-transform duration-300'"
        :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
      >
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ arrows[direction] }}</span>
        <span class="text-xs text-(--fg-subtle)">{{ isSwiping ? 'swiping…' : 'swipe me' }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
        <div class="flex items-center justify-between">
          <span class="text-(--fg-muted)">Δx</span>
          <span>{{ Math.round(lengthX) }}px</span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <span class="text-(--fg-muted)">Δy</span>
          <span>{{ Math.round(lengthY) }}px</span>
        </div>
      </div>
      <div class="flex flex-col justify-center gap-1 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last swipe</span>
        <span class="font-mono text-sm font-medium capitalize text-(--accent-text)">{{ lastDirection }}</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg-muted) tabular-nums">
      start ({{ Math.round(coordsStart.x) }}, {{ Math.round(coordsStart.y) }})
      → end ({{ Math.round(coordsEnd.x) }}, {{ Math.round(coordsEnd.y) }})
    </div>

    <p class="text-xs text-(--fg-subtle)">
      On a desktop, click and drag with touch emulation; on touch devices, swipe in any direction.
    </p>
  </div>
</template>
