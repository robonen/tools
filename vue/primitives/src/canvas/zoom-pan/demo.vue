<script setup lang="ts">
import { ViewportRoot } from '@robonen/primitives';
import { ref, useTemplateRef } from 'vue';

// The viewport transform: x/y in screen px (applied before scale), zoom factor.
const viewport = ref({ x: 40, y: 40, zoom: 1 });
const vp = useTemplateRef<InstanceType<typeof ViewportRoot>>('vp');

// A fixed content box so `fit` has something to frame.
const contentExtent = { x: 0, y: 0, width: 720, height: 480 };

const tiles = Array.from({ length: 24 }, (_, i) => i);
</script>

<template>
  <div class="demo-card w-full max-w-2xl space-y-4 p-6 text-fg">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Zoom / pan viewport</span>
      <span class="font-mono text-xs text-fg-muted tabular-nums">
        x {{ Math.round(viewport.x) }} · y {{ Math.round(viewport.y) }} · {{ (viewport.zoom * 100).toFixed(0) }}%
      </span>
    </div>

    <ViewportRoot
      ref="vp"
      v-model:viewport="viewport"
      :min-zoom="0.3"
      :max-zoom="4"
      :content-extent="contentExtent"
      aria-label="Pan and zoom surface"
      class="zp relative h-72 w-full overflow-hidden rounded-card border border-border bg-bg-inset shadow-(--shadow-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <template #default>
        <!-- Content lives in the single transformed layer. -->
        <div class="zp-content">
          <div v-for="t in tiles" :key="t" class="zp-tile">{{ t }}</div>
        </div>
      </template>
    </ViewportRoot>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="zp-btn" @click="vp?.zoomIn()">Zoom in</button>
      <button type="button" class="zp-btn" @click="vp?.zoomOut()">Zoom out</button>
      <button type="button" class="zp-btn" @click="vp?.fit(contentExtent)">Fit</button>
      <button type="button" class="zp-btn" @click="vp?.center()">Center</button>
      <button type="button" class="zp-btn" @click="vp?.reset()">Reset</button>
    </div>

    <p class="text-xs text-fg-subtle">
      Drag to pan, scroll to zoom (⌘/Ctrl-scroll to pinch-zoom). The single
      transformed layer keeps coordinate math and hit-testing exact at any zoom.
    </p>
  </div>
</template>

<style scoped>
.zp {
  cursor: grab;
  touch-action: none;
}
.zp:active {
  cursor: grabbing;
}

.zp-content {
  display: grid;
  grid-template-columns: repeat(6, 110px);
  gap: 10px;
  width: 720px;
  padding: 10px;
}
.zp-tile {
  display: grid;
  place-items: center;
  height: 110px;
  border-radius: 12px;
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 30%, #6d28d9) 100%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.15);
}

.zp-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  color: var(--fg);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.zp-btn:hover {
  background: var(--bg-inset);
  border-color: var(--border-strong);
}
.zp-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ring);
}
</style>
