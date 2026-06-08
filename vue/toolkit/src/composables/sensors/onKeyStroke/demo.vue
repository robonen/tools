<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { onKeyStroke } from './index';

// Scope the listener to a focusable capture area so the demo never hijacks the
// page's global keyboard. onKeyStroke takes a MaybeRefOrGetter target via options.
const capture = useTemplateRef<HTMLDivElement>('capture');
const dedupe = ref(true);

const lastKey = ref('');
const lastCode = ref('');
const pressCount = ref(0);
const log = ref<string[]>([]);

// Arrow keys drive a little cursor — demonstrates a string[] key filter that
// can call preventDefault (listener is non-passive by default).
const pos = ref({ x: 2, y: 2 });
const GRID = 5;

// Every key: record the most recent stroke for the readout.
onKeyStroke(
  (event) => {
    lastKey.value = event.key;
    lastCode.value = event.code;
    pressCount.value++;
    log.value = [`${event.key === ' ' ? 'Space' : event.key}`, ...log.value].slice(0, 8);
    return true;
  },
  { target: capture, dedupe },
);

// Arrow filter: move within the grid, prevent page scroll.
onKeyStroke(
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  (event) => {
    event.preventDefault();
    if (event.key === 'ArrowUp') pos.value.y = Math.max(0, pos.value.y - 1);
    if (event.key === 'ArrowDown') pos.value.y = Math.min(GRID - 1, pos.value.y + 1);
    if (event.key === 'ArrowLeft') pos.value.x = Math.max(0, pos.value.x - 1);
    if (event.key === 'ArrowRight') pos.value.x = Math.min(GRID - 1, pos.value.x + 1);
  },
  { target: capture },
);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div
      ref="capture"
      tabindex="0"
      class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-3 outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--ring)"
    >
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Click here, then press keys / arrows
      </span>

      <div class="grid grid-cols-5 gap-1.5">
        <div
          v-for="i in GRID * GRID"
          :key="i"
          class="size-7 rounded-md border transition-colors"
          :class="(i - 1) % GRID === pos.x && Math.floor((i - 1) / GRID) === pos.y
            ? 'bg-(--accent) border-transparent'
            : 'bg-(--bg-inset) border-(--border)'"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-inset) px-2.5 py-1 font-mono text-sm font-semibold text-(--fg)">
          {{ lastKey === ' ' ? 'Space' : (lastKey || '—') }}
        </span>
        <span class="font-mono text-xs text-(--fg-subtle)">{{ lastCode || 'event.code' }}</span>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2">
      <label class="flex items-center gap-2 text-sm text-(--fg) cursor-pointer">
        <input v-model="dedupe" type="checkbox" class="size-4 accent-(--accent) cursor-pointer">
        dedupe held keys
      </label>
      <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ pressCount }} strokes</span>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 min-h-12">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Recent</span>
      <div v-if="log.length" class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="(k, i) in log"
          :key="i"
          class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 font-mono text-xs text-(--fg-muted)"
        >{{ k }}</span>
      </div>
      <p v-else class="mt-1 text-sm text-(--fg-subtle)">No keys yet — focus the area above.</p>
    </div>
  </div>
</template>
