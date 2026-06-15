<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useParallax } from './index';

const container = useTemplateRef<HTMLElement>('container');
const { roll, tilt, source } = useParallax(container);

// How aggressively the card reacts (degrees at the edges).
const intensity = ref(20);

const cardStyle = computed(() => ({
  transform: `perspective(800px) rotateX(${roll.value * intensity.value}deg) rotateY(${tilt.value * intensity.value}deg)`,
}));

const layer = (depth: number) => ({
  transform: `translateX(${tilt.value * depth}px) translateY(${-roll.value * depth}px)`,
});

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(3);
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      ref="container"
      class="relative grid place-items-center overflow-hidden rounded-xl border border-border bg-bg-inset p-8"
    >
      <div
        class="relative aspect-[4/3] w-full max-w-[16rem] rounded-xl border border-border-strong bg-bg-elevated shadow-xl transition-transform duration-75 ease-out will-change-transform"
        :style="cardStyle"
      >
        <div class="absolute inset-0 grid place-items-center" :style="layer(8)">
          <span class="demo-label">
            depth 8
          </span>
        </div>
        <div class="absolute inset-0 grid place-items-center" :style="layer(24)">
          <span class="demo-stat text-2xl">
            Parallax
          </span>
        </div>
        <div class="absolute bottom-3 right-3" :style="layer(40)">
          <span class="demo-badge">
            depth 40
          </span>
        </div>
      </div>
    </div>

    <p class="text-center text-xs text-fg-subtle">
      Move your pointer over the panel &mdash; layers shift by depth.
    </p>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <label class="demo-label">
          Intensity
        </label>
        <span class="font-mono text-xs tabular-nums text-fg-muted">{{ intensity }}&deg;</span>
      </div>
      <input
        v-model.number="intensity"
        type="range"
        min="0"
        max="45"
        step="1"
        class="w-full accent-accent"
      >
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <div class="demo-label">Roll</div>
        <div class="mt-1 font-mono text-sm tabular-nums text-fg">{{ fmt(roll) }}</div>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <div class="demo-label">Tilt</div>
        <div class="mt-1 font-mono text-sm tabular-nums text-fg">{{ fmt(tilt) }}</div>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <div class="demo-label">Source</div>
        <div class="mt-1 font-mono text-sm capitalize text-fg">{{ source }}</div>
      </div>
    </div>
  </div>
</template>
