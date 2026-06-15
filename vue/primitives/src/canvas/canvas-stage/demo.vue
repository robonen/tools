<script setup lang="ts">
import {
  CanvasStageContent,
  CanvasStagePane,
  CanvasStageRoot,
  CanvasStageZoomIndicator,
} from '@robonen/primitives';
import { useTemplateRef } from 'vue';

const stage = useTemplateRef<InstanceType<typeof CanvasStageRoot>>('stage');
</script>

<template>
  <div class="demo-card w-full max-w-2xl space-y-4 p-6 text-fg">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Canvas stage</span>
    </div>

    <CanvasStageRoot
      ref="stage"
      aria-label="Zoomable photo"
      :min-zoom="0.2"
      :max-zoom="6"
      class="stage relative h-80 w-full overflow-hidden rounded-card border border-border bg-bg-inset shadow-(--shadow-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CanvasStagePane class="size-full">
        <CanvasStageContent>
          <!-- A CSS-gradient "photo" with an intrinsic size so fit modes work. -->
          <div class="stage-photo">
            <div class="stage-photo__sun" />
            <div class="stage-photo__grid" />
            <span class="stage-photo__caption">1200 × 800</span>
          </div>
        </CanvasStageContent>
      </CanvasStagePane>

      <!-- Visible zoom badge driven by the same indicator value. -->
      <CanvasStageZoomIndicator class="stage-badge">
        <template #default="{ percent }">{{ percent }}%</template>
      </CanvasStageZoomIndicator>
    </CanvasStageRoot>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="stage-btn" @click="stage?.zoomIn()">Zoom in</button>
      <button type="button" class="stage-btn" @click="stage?.zoomOut()">Zoom out</button>
      <button type="button" class="stage-btn" @click="stage?.fitView()">Fit</button>
      <button type="button" class="stage-btn" @click="stage?.fitFill()">Fill</button>
      <button type="button" class="stage-btn" @click="stage?.zoomToActual()">1:1</button>
      <button type="button" class="stage-btn" @click="stage?.reset()">Reset</button>
    </div>

    <p class="text-xs text-fg-subtle">
      Drag to pan, scroll to zoom, or focus the stage and use Arrow keys, +/-, and 0 / 1 / 2 for 1:1 / fit / fill.
    </p>
  </div>
</template>

<style scoped>
.stage {
  cursor: grab;
  touch-action: none;
}
.stage:active {
  cursor: grabbing;
}

/* Intrinsic-sized gradient "photo". */
.stage-photo {
  position: relative;
  width: 1200px;
  height: 800px;
  overflow: hidden;
  background:
    radial-gradient(circle at 28% 26%, #fde68a 0%, transparent 30%),
    linear-gradient(160deg, #6d28d9 0%, #db2777 45%, #f97316 100%);
}
.stage-photo__sun {
  position: absolute;
  top: 120px;
  left: 240px;
  width: 220px;
  height: 220px;
  border-radius: 9999px;
  background: radial-gradient(circle, #fffbeb 0%, #fde047 55%, transparent 72%);
  filter: blur(2px);
}
.stage-photo__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.08) 1px, transparent 1px);
  background-size: 80px 80px;
}
.stage-photo__caption {
  position: absolute;
  bottom: 24px;
  right: 28px;
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 600;
  color: rgb(255 255 255 / 0.85);
  letter-spacing: 0.05em;
}

.stage-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  padding: 2px 8px;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--fg);
  background: color-mix(in oklch, var(--bg) 80%, transparent);
  border: 1px solid var(--border);
  backdrop-filter: blur(4px);
}

.stage-btn {
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
.stage-btn:hover {
  background: var(--bg-inset);
  border-color: var(--border-strong);
}
.stage-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ring);
}
</style>
