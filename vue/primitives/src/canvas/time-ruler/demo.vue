<script setup lang="ts">
import { TimeRulerCursor, TimeRulerRoot } from '@robonen/primitives';
import type { TimeRulerMode } from '@robonen/primitives';
import { ref } from 'vue';

const DURATION = 600; // 10 minutes of content

const offset = ref(0);
const zoom = ref(40); // pixels per second
const mode = ref<TimeRulerMode>('timecode');
const playhead = ref(72);

const modes: TimeRulerMode[] = ['seconds', 'timecode', 'frames'];
</script>

<template>
  <div class="demo-card w-full max-w-2xl space-y-4 p-6 text-fg">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-0.5">
        <div class="text-sm font-medium">Time ruler</div>
        <div class="font-mono text-xs text-fg-muted">
          offset {{ offset.toFixed(1) }}s · {{ Math.round(zoom) }} px/s
        </div>
      </div>

      <div class="flex items-center gap-1 rounded-lg border border-border bg-bg-inset p-0.5">
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="mode === m ? 'bg-accent text-accent-fg' : 'text-fg-muted hover:text-fg'"
          @click="mode = m"
        >
          {{ m }}
        </button>
      </div>
    </div>

    <!-- The ruler. The default slot exposes the generated tick collections. -->
    <TimeRulerRoot
      v-model:offset="offset"
      v-model:zoom="zoom"
      :duration="DURATION"
      :mode="mode"
      :fps="30"
      :min-zoom="6"
      :max-zoom="240"
      focusable
      wheel
      draggable
      class="ruler relative h-16 w-full overflow-hidden rounded-card border border-border bg-bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <template #default="{ ticks, formatTime }">
        <!-- Tick layer rendered straight from the slot's `ticks`. -->
        <div
          v-for="tick in ticks"
          :key="tick.value"
          class="ruler-tick"
          :class="tick.major ? 'ruler-tick--major' : 'ruler-tick--minor'"
          :style="{ left: `${tick.px}px` }"
        >
          <span v-if="tick.major" class="ruler-tick__label">{{ tick.label }}</span>
        </div>

        <!-- Playhead cursor, positioned through the ruler's own scale. -->
        <TimeRulerCursor :time="playhead" class="ruler-cursor">
          <template #default="{ time }">
            <span class="ruler-cursor__flag">{{ formatTime(time) }}</span>
          </template>
        </TimeRulerCursor>
      </template>
    </TimeRulerRoot>

    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="zoom = Math.min(240, zoom * 1.4)"
      >
        Zoom in
      </button>
      <button
        type="button"
        class="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="zoom = Math.max(6, zoom / 1.4)"
      >
        Zoom out
      </button>
      <label class="flex flex-1 items-center gap-2 text-xs text-fg-muted">
        Playhead
        <input
          v-model.number="playhead"
          type="range"
          min="0"
          :max="DURATION"
          step="1"
          class="flex-1 accent-(--accent)"
        >
      </label>
    </div>

    <p class="text-xs text-fg-subtle">
      Drag to pan, scroll to scroll, Ctrl/Cmd + scroll to zoom, or focus the ruler and use Arrow / +/- keys.
    </p>
  </div>
</template>

<style scoped>
.ruler {
  cursor: grab;
  touch-action: none;
}
.ruler[data-panning] {
  cursor: grabbing;
}

.ruler-tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  background: var(--border-strong);
}
.ruler-tick--minor {
  height: 0.5rem;
  opacity: 0.7;
}
.ruler-tick--major {
  height: 1.25rem;
  background: var(--fg-subtle);
}
.ruler-tick__label {
  position: absolute;
  top: -1.1rem;
  left: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  white-space: nowrap;
  color: var(--fg-muted);
}

/* Playhead cursor. */
.ruler-cursor {
  top: 0;
  bottom: 0;
  width: 0;
}
.ruler-cursor::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: var(--accent);
}
.ruler-cursor__flag {
  position: absolute;
  bottom: 0.25rem;
  left: 0;
  transform: translateX(-50%);
  padding: 1px 6px;
  border-radius: 9999px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 600;
  white-space: nowrap;
  color: var(--accent-fg);
  background: var(--accent);
}
</style>
