<script setup lang="ts">
import {
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderDivider,
  CompareSliderHandle,
  CompareSliderRoot,
} from '@robonen/primitives';
import { ref } from 'vue';

const position = ref(50);
const valueText = (p: number) => `${Math.round(p)}% revealed`;
</script>

<template>
  <div class="demo-card w-full max-w-md space-y-4 p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <span class="font-medium">Before / After</span>
      <span class="font-mono text-fg-muted">{{ Math.round(position) }}% after</span>
    </div>

    <CompareSliderRoot
      v-model:position="position"
      :value-text="valueText"
      class="compare-root group relative aspect-video w-full select-none overflow-hidden rounded-card border border-border shadow-(--shadow-card)"
    >
      <!-- "Before" layer: cool graded photo -->
      <CompareSliderBefore class="compare-before">
        <span class="absolute left-3 top-3 rounded-md bg-bg/80 px-2 py-0.5 text-xs font-medium text-fg backdrop-blur">
          Before
        </span>
      </CompareSliderBefore>

      <!-- "After" layer: warm graded photo, clipped to the reveal % -->
      <CompareSliderAfter class="compare-after">
        <span class="absolute right-3 top-3 rounded-md bg-bg/80 px-2 py-0.5 text-xs font-medium text-fg backdrop-blur">
          After
        </span>
      </CompareSliderAfter>

      <!-- Seam line -->
      <CompareSliderDivider class="compare-divider" />

      <!-- Grab / focus target -->
      <CompareSliderHandle
        aria-label="Comparison position"
        class="compare-handle"
      >
        <span class="compare-handle__grip" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
            <polyline points="9 18 3 12 9 6" transform="translate(12 0)" />
          </svg>
        </span>
      </CompareSliderHandle>
    </CompareSliderRoot>

    <p class="text-xs text-fg-subtle">
      Drag the handle (or focus it and use Arrow / Home / End keys) to reveal the after image.
    </p>
  </div>
</template>

<style scoped>
.compare-root {
  cursor: ew-resize;
  touch-action: none;
}

/* Two contrasting CSS-gradient "photos" stand in for real images. */
.compare-before :deep(*),
.compare-before {
  background: linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 50%, #22d3ee 100%);
}
.compare-before {
  background:
    radial-gradient(circle at 70% 30%, rgb(255 255 255 / 0.25), transparent 45%),
    linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 55%, #22d3ee 100%);
}
.compare-after {
  background:
    radial-gradient(circle at 30% 70%, rgb(255 255 255 / 0.3), transparent 45%),
    linear-gradient(135deg, #b45309 0%, #f97316 55%, #facc15 100%);
}

/* Thin seam line at the split. */
.compare-divider {
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: rgb(255 255 255 / 0.9);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
}

/* Round grab puck centred on the seam. */
.compare-handle {
  top: 50%;
  display: grid;
  place-items: center;
  width: 0;
  height: 0;
  outline: none;
}
.compare-handle__grip {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--fg);
  background: var(--bg);
  border-radius: 9999px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  transform: translate(-50%, -50%);
  transition: transform 0.12s ease;
}
.compare-handle:hover .compare-handle__grip {
  transform: translate(-50%, -50%) scale(1.08);
}
.compare-handle:focus-visible .compare-handle__grip {
  box-shadow: 0 0 0 3px var(--ring), 0 1px 3px rgb(0 0 0 / 0.3);
}
</style>
