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
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">ResizeObserver</span>
      <span class="demo-badge">
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
        class="demo-card relative grid min-h-32 min-w-40 max-w-full resize overflow-auto p-4 place-items-center"
        style="width: 16rem; height: 8rem;"
      >
        <div class="pointer-events-none select-none text-center">
          <div class="demo-stat text-3xl">
            {{ size.width }}<span class="text-fg-subtle"> × </span>{{ size.height }}
          </div>
          <div class="mt-1 text-xs text-fg-subtle">drag the bottom-right corner</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-border bg-bg-inset p-2 text-center">
          <div class="demo-stat text-lg">{{ size.width }}</div>
          <div class="text-[10px] uppercase tracking-wide text-fg-subtle">width px</div>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-2 text-center">
          <div class="demo-stat text-lg">{{ size.height }}</div>
          <div class="text-[10px] uppercase tracking-wide text-fg-subtle">height px</div>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-2 text-center">
          <div class="demo-stat text-lg">{{ callbacks }}</div>
          <div class="text-[10px] uppercase tracking-wide text-fg-subtle">callbacks</div>
        </div>
      </div>

      <button
        type="button"
        class="demo-btn-primary"
        @click="isActive ? pause() : resume()"
      >
        {{ isActive ? 'Pause observer' : 'Resume observer' }}
      </button>
      <p class="text-xs text-fg-subtle">
        While paused, resizing won't update the readout until you resume.
      </p>
    </template>
  </div>
</template>
