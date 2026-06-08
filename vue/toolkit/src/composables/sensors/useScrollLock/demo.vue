<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useScrollLock } from './index';

const el = useTemplateRef<HTMLElement>('el');
const isLocked = useScrollLock(el);

const lines = [
  'The kingfisher dives where the river bends.',
  'Reeds lean low over the slow green water.',
  'A heron stands knee-deep in the shallows.',
  'Dragonflies stitch the air above the lilies.',
  'Sunlight breaks across the rippling surface.',
  'Trout shadows drift beneath the willow roots.',
  'The current folds and unfolds the weeds.',
  'Far off, a mill wheel turns and turns.',
];
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Scroll lock</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isLocked
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        {{ isLocked ? 'locked' : 'free' }}
      </span>
    </div>

    <div
      ref="el"
      class="h-44 overflow-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-4"
    >
      <p
        v-for="(line, i) in lines"
        :key="i"
        class="py-1.5 text-sm leading-relaxed text-(--fg)"
      >
        {{ line }}
      </p>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      {{ isLocked ? 'Overflow is hidden — the panel above will not scroll.' : 'Try scrolling the panel, then lock it.' }}
    </p>

    <div class="flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <button
        type="button"
        role="switch"
        :aria-checked="isLocked"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-(--border) transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--ring)"
        :class="isLocked ? 'bg-(--accent)' : 'bg-(--bg-elevated)'"
        @click="isLocked = !isLocked"
      >
        <span
          class="inline-block size-4 rounded-full bg-(--bg) shadow transition"
          :class="isLocked ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
      <span class="text-sm font-medium text-(--fg)">Lock scrolling</span>
    </div>
  </div>
</template>
