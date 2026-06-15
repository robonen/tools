<script setup lang="ts">
import {
  TransformBoxHandle,
  TransformBoxRoot,
  TransformBoxRotateHandle,
  TransformBoxStatus,
} from '@robonen/primitives';
import type { TransformBoxHandlePosition, TransformBoxValue } from '@robonen/primitives';
import { ref } from 'vue';

// The eight resize handles, in the package's stable order.
const HANDLES: TransformBoxHandlePosition[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
];

// Controlled transform: x / y are the box origin in stage px, width / height its
// unrotated size, rotation in degrees. The gradient 'object' fills the box.
const transform = ref<TransformBoxValue>({
  x: 96,
  y: 64,
  width: 200,
  height: 130,
  rotation: -8,
});

const r = (n: number) => Math.round(n);

function reset() {
  transform.value = { x: 96, y: 64, width: 200, height: 130, rotation: -8 };
}
</script>

<template>
  <div class="demo-card w-full max-w-xl space-y-4 p-6 text-fg">
    <div class="flex items-baseline justify-between">
      <div>
        <h3 class="text-sm font-semibold">Transform box</h3>
        <p class="text-xs text-fg-muted">Drag the body to move, the corner/edge squares to scale, the dot above to rotate.</p>
      </div>
      <button
        type="button"
        class="rounded-md border border-border bg-bg px-2.5 py-1 text-xs font-medium text-fg-muted transition hover:border-border-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <!-- Stage: positioned ancestor for the absolutely-laid-out box. -->
    <div
      class="relative h-80 w-full select-none overflow-hidden rounded-card border border-border bg-bg-inset"
      style="background-image: linear-gradient(45deg, var(--color-border) 0.5px, transparent 0.5px), linear-gradient(-45deg, var(--color-border) 0.5px, transparent 0.5px); background-size: 16px 16px;"
    >
      <TransformBoxRoot
        v-model="transform"
        :min-width="40"
        :min-height="40"
        :rotation-snap="15"
        class="group cursor-move outline-none"
      >
        <!-- The 'object': a gradient that fills (and therefore scales + rotates with) the box. -->
        <div
          class="pointer-events-none absolute inset-0 rounded-sm shadow-(--shadow-card)"
          style="background: linear-gradient(135deg, oklch(0.72 0.18 28) 0%, oklch(0.68 0.17 330) 50%, oklch(0.74 0.15 250) 100%);"
        />

        <!-- Selection outline -->
        <div class="pointer-events-none absolute inset-0 rounded-sm border-2 border-accent ring-1 ring-bg/40" />

        <!-- Rotate stem + handle (positioned above the top edge by the part's default style). -->
        <div class="pointer-events-none absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 -translate-y-full bg-accent" />
        <TransformBoxRotateHandle
          class="-translate-y-6 block h-3.5 w-3.5 cursor-grab rounded-full border-2 border-accent bg-bg shadow-(--shadow-card) outline-none transition active:cursor-grabbing hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
        />

        <!-- Eight scale handles as small accent squares on the corners + edge midpoints. -->
        <TransformBoxHandle
          v-for="pos in HANDLES"
          :key="pos"
          :position="pos"
          class="block h-2.5 w-2.5 rounded-[2px] border border-bg bg-accent shadow-sm outline-none transition hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring"
          :class="pos === 'left' || pos === 'right' ? 'cursor-ew-resize' : pos === 'top' || pos === 'bottom' ? 'cursor-ns-resize' : pos === 'top-left' || pos === 'bottom-right' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'"
        />

        <!-- Visually-hidden live region for assistive tech. -->
        <TransformBoxStatus />
      </TransformBoxRoot>
    </div>

    <!-- Live geometry readout. -->
    <dl class="grid grid-cols-5 gap-2 text-center">
      <div v-for="item in [
        { label: 'X', value: `${r(transform.x)}` },
        { label: 'Y', value: `${r(transform.y)}` },
        { label: 'W', value: `${r(transform.width)}` },
        { label: 'H', value: `${r(transform.height)}` },
        { label: 'Rotation', value: `${r(transform.rotation)}°` },
      ]" :key="item.label" class="rounded-md border border-border bg-bg-inset py-1.5">
        <dt class="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">{{ item.label }}</dt>
        <dd class="font-mono text-sm text-fg">{{ item.value }}</dd>
      </div>
    </dl>

    <p class="text-xs text-fg-subtle">
      Hold <kbd class="rounded border border-border bg-bg px-1 font-mono">Shift</kbd> on a corner to lock aspect, on the rotate dot to snap to 15°.
      Focus the box and use arrow keys to nudge.
    </p>
  </div>
</template>
