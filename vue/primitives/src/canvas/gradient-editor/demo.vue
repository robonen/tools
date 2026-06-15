<script setup lang="ts">
import type { GradientStop } from '@robonen/primitives';
import {
  GradientEditorRoot,
  GradientEditorStop,
  GradientEditorStops,
  GradientEditorTrack,
} from '@robonen/primitives';
import { computed, ref } from 'vue';

// A couple of synthetic stops to seed the bar. `position` is a fraction [0, 1].
const stops = ref<GradientStop[]>([
  { id: 'stop-a', position: 0, color: '#6366f1' },
  { id: 'stop-b', position: 0.5, color: '#ec4899' },
  { id: 'stop-c', position: 1, color: '#f59e0b' },
]);

const selectedId = ref<string | null>('stop-b');

const selectedStop = computed(() =>
  stops.value.find(s => s.id === selectedId.value) ?? null,
);

// A small palette to recolor the selected stop without an embedded color picker.
const swatches = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#ffffff', '#111827'];

function recolorSelected(color: string): void {
  const stop = selectedStop.value;
  if (stop) stop.color = color;
}

function fmtPct(position: number): string {
  return `${Math.round(position * 100)}%`;
}
</script>

<template>
  <div class="demo-card w-full max-w-md space-y-6 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Gradient editor</span>
      <span class="font-mono text-fg-muted">{{ stops.length }} stops</span>
    </div>

    <GradientEditorRoot
      v-model="stops"
      v-model:selected-id="selectedId"
      :min-stops="2"
      class="space-y-4"
    >
      <template #default="{ cssGradient }">
        <!-- Live CSS-gradient preview painted from the exposed cssGradient -->
        <div
          class="h-16 w-full rounded-card border border-border shadow-(--shadow-card)"
          :style="{ background: cssGradient }"
        />

        <!-- The interactive stop bar: track paints itself, stops sit on top -->
        <GradientEditorTrack
          class="relative h-7 w-full cursor-copy touch-none select-none rounded-full border border-border-strong outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :style="{ background: cssGradient }"
        >
          <GradientEditorStops>
            <template #default="{ stop, selected }">
              <GradientEditorStop
                :stop-id="stop.id"
                :aria-label="`Stop at ${fmtPct(stop.position)}`"
                class="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white shadow-md outline-none ring-1 ring-black/30 transition-transform focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing hover:scale-115"
                :class="selected ? 'z-10 scale-115 ring-2 ring-accent' : ''"
                :style="{ backgroundColor: stop.color }"
              />
            </template>
          </GradientEditorStops>
        </GradientEditorTrack>
      </template>
    </GradientEditorRoot>

    <p class="text-xs text-fg-subtle">
      Drag a stop to move it, or click an empty part of the bar to add one.
    </p>

    <!-- Selected stop inspector + a swatch palette to recolor it -->
    <div v-if="selectedStop" class="space-y-3 rounded-card bg-bg-inset p-3">
      <div class="flex items-center gap-3">
        <span
          class="size-9 shrink-0 rounded-lg border border-border-strong"
          :style="{ backgroundColor: selectedStop.color }"
        />
        <div class="flex flex-col text-sm leading-tight">
          <span class="font-mono text-fg">{{ selectedStop.color }}</span>
          <span class="font-mono text-xs text-fg-subtle">at {{ fmtPct(selectedStop.position) }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="swatch in swatches"
          :key="swatch"
          type="button"
          class="size-6 rounded-md border border-border-strong outline-none transition focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
          :class="selectedStop.color.toLowerCase() === swatch.toLowerCase() ? 'ring-2 ring-accent' : ''"
          :style="{ backgroundColor: swatch }"
          :aria-label="`Set selected stop to ${swatch}`"
          @click="recolorSelected(swatch)"
        />
      </div>
    </div>
  </div>
</template>
