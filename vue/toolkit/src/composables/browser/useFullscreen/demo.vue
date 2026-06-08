<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useFullscreen } from './index';

const target = useTemplateRef<HTMLElement>('target');
const { isSupported, isFullscreen, enter, exit, toggle } = useFullscreen(target);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-600 dark:text-amber-400"
    >
      The Fullscreen API is not supported in this browser.
    </div>

    <div
      ref="target"
      class="relative flex h-44 flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated) transition-colors"
      :class="isFullscreen && 'bg-(--bg-inset)'"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isFullscreen
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span class="size-1.5 rounded-full" :class="isFullscreen ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
        {{ isFullscreen ? 'Fullscreen' : 'Windowed' }}
      </span>

      <p class="px-6 text-center text-sm text-(--fg-muted)">
        This panel becomes the fullscreen target. Press
        <kbd class="rounded border border-(--border) bg-(--bg) px-1.5 py-0.5 font-mono text-xs text-(--fg)">Esc</kbd>
        to leave.
      </p>

      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isSupported"
        @click="toggle"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="isFullscreen">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </template>
          <template v-else>
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </template>
        </svg>
        {{ isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen' }}
      </button>
    </div>

    <div class="flex gap-2">
      <button
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isSupported || isFullscreen"
        @click="enter"
      >
        Enter
      </button>
      <button
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isSupported || !isFullscreen"
        @click="exit"
      >
        Exit
      </button>
    </div>
  </div>
</template>
