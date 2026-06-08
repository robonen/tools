<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useMousePressed } from './index';

const pad = useTemplateRef<HTMLElement>('pad');

const pressCount = ref(0);

// Only track presses that begin on the pad, with press/release callbacks.
const { pressed, sourceType } = useMousePressed({
  target: pad,
  onPressed: () => { pressCount.value += 1; },
});

const sourceLabel = {
  mouse: 'Mouse',
  touch: 'Touch',
} as const;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      ref="pad"
      class="flex h-40 w-full cursor-pointer select-none items-center justify-center rounded-xl border-2 text-center transition-all duration-150"
      :class="pressed
        ? 'scale-[0.98] border-(--accent) bg-(--accent)/10'
        : 'border-(--border) bg-(--bg-inset) hover:border-(--border-strong)'"
    >
      <div class="flex flex-col items-center gap-2">
        <span
          class="flex size-12 items-center justify-center rounded-full transition-all duration-150"
          :class="pressed ? 'scale-110 bg-(--accent) text-(--accent-fg)' : 'bg-(--bg-elevated) text-(--fg-subtle)'"
        >
          <span class="size-3 rounded-full bg-current" />
        </span>
        <span class="text-sm font-medium" :class="pressed ? 'text-(--accent-text)' : 'text-(--fg-muted)'">
          {{ pressed ? 'Holding…' : 'Press and hold' }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Pressed</p>
        <p class="mt-1 text-sm font-semibold" :class="pressed ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg)'">
          {{ pressed ? 'true' : 'false' }}
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Source</p>
        <p class="mt-1 font-mono text-sm font-semibold text-(--fg)">
          {{ sourceType ? sourceLabel[sourceType] : '—' }}
        </p>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Presses</p>
        <p class="mt-1 font-mono text-sm font-bold tabular-nums text-(--fg)">{{ pressCount }}</p>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Tracking is scoped to the pad via <code class="font-mono">target</code>, but release is global &mdash; let go anywhere and <code class="font-mono">pressed</code> flips back.
    </p>
  </div>
</template>
