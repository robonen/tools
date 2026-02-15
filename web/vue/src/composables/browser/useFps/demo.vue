<script setup lang="ts">
import { useFps } from './index';

const { fps, min, max, isActive, reset, toggle } = useFps({ every: 10 });
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end gap-8">
      <div>
        <div class="text-4xl font-mono font-bold tabular-nums text-(--color-text)">{{ fps }}</div>
        <div class="text-xs text-(--color-text-mute) mt-1">FPS</div>
      </div>
      <div>
        <div class="text-xl font-mono tabular-nums text-(--color-text-soft)">{{ min === Infinity ? '—' : min }}</div>
        <div class="text-xs text-(--color-text-mute) mt-1">Min</div>
      </div>
      <div>
        <div class="text-xl font-mono tabular-nums text-(--color-text-soft)">{{ max || '—' }}</div>
        <div class="text-xs text-(--color-text-mute) mt-1">Max</div>
      </div>
    </div>

    <div class="h-2 rounded-full border border-(--color-border) overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="fps >= 50 ? 'bg-emerald-500' : fps >= 30 ? 'bg-amber-500' : 'bg-red-500'"
        :style="{ width: `${Math.min(fps / 60 * 100, 100)}%` }"
      />
    </div>

    <div class="flex items-center gap-2">
      <button
        class="px-3 py-1.5 text-sm rounded-md border border-(--color-border) bg-(--color-bg) hover:bg-(--color-bg-mute) text-(--color-text-soft) transition-colors cursor-pointer"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
      <button
        class="px-3 py-1.5 text-sm rounded-md border border-(--color-border) bg-(--color-bg) hover:bg-(--color-bg-mute) text-(--color-text-soft) transition-colors cursor-pointer"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
