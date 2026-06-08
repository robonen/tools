<script setup lang="ts">
import { computed, reactive, useTemplateRef } from 'vue';
import { usePointerLock } from './index';

const stage = useTemplateRef<HTMLElement>('stage');
const { isSupported, element, lock, unlock } = usePointerLock(stage);

const isLocked = computed(() => !!element.value);

// Accumulate relative movement deltas while the pointer is locked.
const pos = reactive({ x: 50, y: 50 });

function onMove(event: PointerEvent) {
  if (!isLocked.value)
    return;

  pos.x = clamp(pos.x + event.movementX * 0.25);
  pos.y = clamp(pos.y + event.movementY * 0.25);
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

async function toggle() {
  if (isLocked.value)
    await unlock();
  else
    await lock(stage);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <template v-if="isSupported">
      <div
        ref="stage"
        class="relative h-44 cursor-pointer select-none overflow-hidden rounded-xl border bg-(--bg-inset) transition"
        :class="isLocked ? 'border-(--accent)' : 'border-(--border)'"
        @click="toggle"
        @pointermove="onMove"
      >
        <div
          class="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-(--accent-fg) bg-(--accent) shadow-lg transition-[box-shadow]"
          :style="{ left: `${pos.x}%`, top: `${pos.y}%` }"
        />
        <div class="pointer-events-none absolute inset-0 grid place-items-center">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            {{ isLocked ? 'Locked — move your mouse' : 'Click to lock pointer' }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="isLocked
          ? 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'
          : 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'"
        @click="toggle"
      >
        {{ isLocked ? 'Release pointer (Esc)' : 'Lock pointer' }}
      </button>

      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
        <span class="text-sm text-(--fg-muted)">Lock state</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
          :class="isLocked
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span class="size-1.5 rounded-full transition" :class="isLocked ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ isLocked ? 'Locked' : 'Unlocked' }}
        </span>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        While locked, the cursor is hidden and only relative
        <code class="font-mono">movementX/Y</code> drives the dot. Press
        <kbd class="rounded border border-(--border) bg-(--bg-elevated) px-1 font-mono text-[0.7rem]">Esc</kbd>
        to release.
      </p>
    </template>

    <div
      v-else
      class="flex flex-col items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center"
    >
      <span class="text-sm font-medium text-amber-600 dark:text-amber-400">
        Pointer Lock API not supported
      </span>
      <span class="text-xs text-(--fg-subtle)">
        This browser cannot lock the pointer to an element.
      </span>
    </div>
  </div>
</template>
