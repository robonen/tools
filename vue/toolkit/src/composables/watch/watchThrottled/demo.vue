<script setup lang="ts">
import { ref } from 'vue';
import { watchThrottled } from './index';

const throttle = ref(500);
const volume = ref(42);
const saved = ref(42);
const saveCount = ref(0);
const flash = ref(false);

watchThrottled(volume, (value) => {
  saved.value = value;
  saveCount.value++;
  flash.value = true;
  setTimeout(() => { flash.value = false; }, 220);
}, { throttle });
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Live value
        </label>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ volume }}</span>
      </div>
      <input
        v-model.number="volume"
        type="range"
        min="0"
        max="100"
        class="w-full cursor-pointer accent-(--accent)"
      >
      <p class="text-xs text-(--fg-muted)">
        Drag rapidly — updates fire continuously, but the throttled callback only commits at most once per interval.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Saved (throttled)
        </div>
        <div
          class="mt-1 font-mono text-3xl font-bold tabular-nums transition-colors duration-150"
          :class="flash ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg)'"
        >
          {{ saved }}
        </div>
      </div>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Commits
        </div>
        <div class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ saveCount }}
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Throttle interval
        </label>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ throttle }} ms</span>
      </div>
      <input
        v-model.number="throttle"
        type="range"
        min="0"
        max="2000"
        step="100"
        class="w-full cursor-pointer accent-(--accent)"
      >
      <p class="text-xs text-(--fg-muted)">
        The interval is reactive — change it and the next throttle window adapts immediately.
      </p>
    </div>
  </div>
</template>
