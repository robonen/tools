<script setup lang="ts">
import type { CurveEditorAnchor, CurveEditorChannel } from '@robonen/primitives';
import {
  CurveEditorCurve,
  CurveEditorGrid,
  CurveEditorPoint,
  CurveEditorRoot,
  buildEvaluator,
} from '@robonen/primitives';
import { computed, ref } from 'vue';

// A tone curve with a gentle S-shape: lifted shadows, pulled highlights.
const anchors = ref<CurveEditorAnchor[]>([
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 0.28, y: 0.18 },
  { id: 'c', x: 0.72, y: 0.86 },
  { id: 'd', x: 1, y: 1 },
]);

// Mirror the Root's evaluator with the exported `buildEvaluator` so the readout
// table below can show the curve's output at a few fixed inputs (same monotone
// interpolation the Root uses).
const sampleFn = computed(() => buildEvaluator(anchors.value, 'monotone'));
const probes = [0, 0.25, 0.5, 0.75, 1];
const readout = computed(() => probes.map(x => ({ x, y: sampleFn.value(x) })));

// Channel toggle — purely cosmetic here (tags the curve / data-channel), but it
// drives the accent color of the curve and points.
const channel = ref<CurveEditorChannel>('value');
const channels: Array<{ id: CurveEditorChannel; label: string }> = [
  { id: 'value', label: 'Value' },
  { id: 'r', label: 'Red' },
  { id: 'g', label: 'Green' },
  { id: 'b', label: 'Blue' },
];

const channelColor = computed(() => {
  switch (channel.value) {
    case 'r': return '#ef4444';
    case 'g': return '#22c55e';
    case 'b': return '#3b82f6';
    default: return 'var(--color-accent, #6366f1)';
  }
});
</script>

<template>
  <div class="demo-card w-full max-w-md space-y-4 bg-bg p-6 text-fg">
    <!-- Channel tabs -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Tone curve</span>
      <div class="flex gap-1 rounded-lg bg-bg-inset p-0.5">
        <button
          v-for="c in channels"
          :key="c.id"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="channel === c.id
            ? 'bg-bg-elevated text-fg shadow-(--shadow-card)'
            : 'text-fg-muted hover:text-fg'"
          @click="channel = c.id"
        >
          {{ c.label }}
        </button>
      </div>
    </div>

    <!-- Plot. The Root measures its OWN box as the plot, so it gets an explicit
         size + relative positioning; absolutely-positioned SVG (grid + curve)
         and the draggable Point thumbs all read pixel coords from that box. -->
    <CurveEditorRoot
      v-model="anchors"
      :channel="channel"
      interpolation="monotone"
      :domain-x="[0, 1]"
      :domain-y="[0, 1]"
      class="relative aspect-square w-full touch-none select-none overflow-hidden rounded-card border border-border bg-bg-inset"
      :style="{ '--curve-color': channelColor }"
    >
      <template #default>
        <svg
          class="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <!-- Gridlines from niceTicks on each axis (decorative). -->
          <CurveEditorGrid v-slot="{ xTicks, yTicks }">
            <line
              v-for="t in xTicks"
              :key="`x-${t.value}`"
              :x1="t.px"
              :y1="0"
              :x2="t.px"
              y2="100%"
              class="stroke-border"
              stroke-width="1"
            />
            <line
              v-for="t in yTicks"
              :key="`y-${t.value}`"
              x1="0"
              :y1="t.px"
              x2="100%"
              :y2="t.px"
              class="stroke-border"
              stroke-width="1"
            />
          </CurveEditorGrid>

          <!-- Soft fill under the curve + the curve stroke itself. -->
          <CurveEditorCurve v-slot="{ d }" as="g">
            <!-- Close the stroked curve down to the bottom for a soft area fill.
                 `V/H` use unitless user-space px; the huge V is clipped by the
                 plot's `overflow-hidden`, so it always reaches the bottom edge. -->
            <path
              v-if="d"
              :d="`${d} V 9999 H 0 Z`"
              :fill="channelColor"
              fill-opacity="0.10"
              stroke="none"
            />
            <path
              :d="d"
              fill="none"
              :stroke="channelColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </CurveEditorCurve>
        </svg>

        <!-- Draggable anchor thumbs. Each Point sets its own left/top (px).
             The `active`/`endpoint` slot props are scoped to the slot CHILDREN,
             so the conditional styling lives on the inner span, not on the
             CurveEditorPoint element's own `:class`. -->
        <CurveEditorPoint
          v-for="a in anchors"
          :key="a.id"
          v-slot="{ active, endpoint }"
          :anchor="a"
          class="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            class="block h-3.5 w-3.5 rounded-full border-2 bg-bg shadow-sm transition hover:scale-125"
            :style="{ borderColor: 'var(--curve-color)' }"
            :class="[
              active ? 'scale-125 ring-2 ring-ring' : '',
              endpoint ? 'rounded-sm' : '',
            ]"
          />
          <span class="sr-only">{{ endpoint ? 'Endpoint' : 'Anchor' }}</span>
        </CurveEditorPoint>
      </template>
    </CurveEditorRoot>

    <!-- Sampled readout: f(x) at a few fixed inputs. -->
    <div class="space-y-1.5 rounded-card bg-bg-inset p-3">
      <div class="flex items-center justify-between text-xs text-fg-subtle">
        <span>input x</span>
        <span>output f(x)</span>
      </div>
      <div
        v-for="p in readout"
        :key="p.x"
        class="flex items-center gap-3"
      >
        <span class="w-8 font-mono text-xs text-fg-muted">{{ p.x.toFixed(2) }}</span>
        <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated">
          <div
            class="absolute inset-y-0 left-0 rounded-full"
            :style="{ width: `${Math.round(p.y * 100)}%`, backgroundColor: channelColor }"
          />
        </div>
        <span class="w-10 text-right font-mono text-xs tabular-nums text-fg">{{ p.y.toFixed(3) }}</span>
      </div>
    </div>

    <p class="text-xs text-fg-subtle">
      Drag the anchors. Double-click an endpoint to add a point, or an interior
      point to remove it. Arrow keys nudge the focused anchor.
    </p>
  </div>
</template>
