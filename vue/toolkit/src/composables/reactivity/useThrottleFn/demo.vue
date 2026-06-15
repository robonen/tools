<script setup lang="ts">
import { ref } from 'vue';
import { useThrottleFn } from './index';

const delay = ref(400);
const moves = ref(0);
const fires = ref(0);
const position = ref({ x: 0, y: 0 });

const onMove = useThrottleFn((x: number, y: number) => {
  fires.value++;
  position.value = { x, y };
}, delay, true, true);

function handlePointer(event: PointerEvent) {
  moves.value++;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
  const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
  onMove(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
}

const ratio = () => (moves.value ? Math.round((fires.value / moves.value) * 100) : 0);
</script>

<template>
  <div class="demo-stack max-w-md">
    <span class="demo-label">useThrottleFn</span>

    <div
      class="relative h-40 w-full overflow-hidden rounded-xl border border-border bg-bg-inset touch-none"
      @pointermove="handlePointer"
    >
      <span
        class="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent-fg bg-accent shadow-md transition-all duration-150 ease-out"
        :style="{ left: `${position.x}%`, top: `${position.y}%` }"
      />
      <span class="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-fg-subtle">
        Move your pointer over this area
      </span>
    </div>

    <div class="flex items-center gap-3">
      <label class="demo-label" for="window">
        Window
      </label>
      <input
        id="window"
        v-model.number="delay"
        type="range"
        min="0"
        max="1000"
        step="50"
        class="flex-1 accent-accent"
      >
      <span class="w-16 text-right font-mono text-sm tabular-nums text-fg">{{ delay }}ms</span>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <p class="demo-label">Events</p>
        <p class="demo-stat mt-1 text-2xl">{{ moves }}</p>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <p class="demo-label">Fired</p>
        <p class="mt-1 font-mono text-2xl font-bold tabular-nums text-accent-text">{{ fires }}</p>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3">
        <p class="demo-label">Ran</p>
        <p class="demo-stat mt-1 text-2xl">{{ ratio() }}%</p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <span class="rounded-md border border-border bg-bg-inset px-2 py-0.5 font-mono text-xs text-fg-muted">
        x: {{ position.x }} · y: {{ position.y }}
      </span>
      <button
        type="button"
        class="demo-btn"
        @click="onMove.flush()"
      >
        Flush trailing
      </button>
    </div>

    <p class="text-xs text-fg-subtle">
      Leading + trailing throttling caps the handler to once per window — drag faster and watch the fired count lag behind events.
    </p>
  </div>
</template>
