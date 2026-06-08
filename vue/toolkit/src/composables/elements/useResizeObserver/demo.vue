<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue';
import { useResizeObserver } from './index';

const target = useTemplateRef<HTMLElement>('target');

const size = reactive({ width: 0, height: 0 });
const callbacks = shallowRef(0);

const { isSupported, isActive, pause, resume } = useResizeObserver(
  target,
  ([entry]) => {
    if (!entry)
      return;

    const { width, height } = entry.contentRect;
    size.width = Math.round(width);
    size.height = Math.round(height);
    callbacks.value++;
  },
);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">ResizeObserver</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-amber-500'" />
        {{ isActive ? 'Observing' : 'Paused' }}
      </span>
    </div>

    <p v-if="!isSupported" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
      ResizeObserver is not supported in this browser.
    </p>

    <template v-else>
      <!-- Drag the bottom-right handle to resize; the observer reports new dimensions -->
      <div
        ref="target"
        class="relative grid min-h-32 min-w-40 max-w-full resize overflow-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-4 place-items-center"
        style="width: 16rem; height: 8rem;"
      >
        <div class="pointer-events-none select-none text-center">
          <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
            {{ size.width }}<span class="text-(--fg-subtle)"> × </span>{{ size.height }}
          </div>
          <div class="mt-1 text-xs text-(--fg-subtle)">drag the bottom-right corner</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ size.width }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">width px</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ size.height }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">height px</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ callbacks }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">callbacks</div>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="isActive ? pause() : resume()"
      >
        {{ isActive ? 'Pause observer' : 'Resume observer' }}
      </button>
      <p class="text-xs text-(--fg-subtle)">
        While paused, resizing won't update the readout until you resume.
      </p>
    </template>
  </div>
</template>
