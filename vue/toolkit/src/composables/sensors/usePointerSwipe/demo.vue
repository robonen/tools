<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { usePointerSwipe } from './index';

const surface = useTemplateRef<HTMLElement>('surface');

const lastDirection = ref<string>('—');
const swipeCount = ref(0);

const { isSwiping, direction, distanceX, distanceY } = usePointerSwipe(surface, {
  threshold: 40,
  onSwipeEnd(_event, dir) {
    if (dir !== 'none') {
      lastDirection.value = dir;
      swipeCount.value++;
    }
  },
});

const arrows: Record<string, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  none: '·',
};

// Follow the live drag while swiping, then snap back.
const cardStyle = computed(() => {
  if (!isSwiping.value)
    return { transform: 'translate(0, 0)' };

  return { transform: `translate(${-distanceX.value}px, ${-distanceY.value}px)` };
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      ref="surface"
      class="relative grid h-44 touch-none place-items-center overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset) select-none"
    >
      <div
        class="grid size-24 place-items-center rounded-xl border border-(--border-strong) bg-(--bg-elevated) shadow-lg"
        :class="isSwiping ? 'transition-none' : 'transition-transform duration-300 ease-out'"
        :style="cardStyle"
      >
        <span class="font-mono text-3xl text-(--fg)">{{ arrows[direction] }}</span>
      </div>
      <span class="pointer-events-none absolute bottom-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Drag in any direction
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Direction</div>
        <div class="mt-1 font-mono text-sm capitalize text-(--fg)">{{ direction }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Swiping</div>
        <div
          class="mt-1 font-mono text-sm"
          :class="isSwiping ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
        >
          {{ isSwiping ? 'active' : 'idle' }}
        </div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums text-(--fg)">
        <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Distance X / Y</div>
        <div class="mt-1">{{ Math.round(distanceX) }} / {{ Math.round(distanceY) }}</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last swipe</div>
        <div class="mt-1 font-mono text-sm capitalize text-(--fg)">
          {{ lastDirection }}
          <span v-if="swipeCount" class="text-(--fg-subtle)">&times;{{ swipeCount }}</span>
        </div>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Threshold is <code class="font-mono">40px</code> &mdash; shorter drags resolve to
      <code class="font-mono">none</code>.
    </p>
  </div>
</template>
