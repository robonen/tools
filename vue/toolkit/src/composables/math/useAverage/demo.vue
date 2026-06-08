<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAverage } from './index';

const scores = ref([88, 92, 76, 95]);
const average = useAverage(scores);

const display = computed(() =>
  scores.value.length === 0 ? 'NaN' : average.value.toFixed(2),
);

function addScore() {
  scores.value.push(Math.floor(Math.random() * 41) + 60);
}

function removeScore(index: number) {
  scores.value.splice(index, 1);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between gap-4 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Average score</span>
        <span class="text-xs text-(--fg-subtle)">{{ scores.length }} value{{ scores.length === 1 ? '' : 's' }}</span>
      </div>
      <span
        class="font-mono text-3xl font-bold tabular-nums"
        :class="scores.length === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-(--fg)'"
      >{{ display }}</span>
    </div>

    <div v-if="scores.length" class="flex flex-col gap-2">
      <div
        v-for="(score, i) in scores"
        :key="i"
        class="flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2"
      >
        <span class="w-6 shrink-0 font-mono text-xs text-(--fg-subtle) tabular-nums">#{{ i + 1 }}</span>
        <input
          v-model.number="scores[i]"
          type="number"
          min="0"
          max="100"
          class="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1 text-sm text-(--fg) tabular-nums transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <button
          type="button"
          aria-label="Remove value"
          class="shrink-0 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-1 text-sm text-(--fg-muted) transition hover:border-(--border-strong) hover:text-(--fg) active:scale-[0.98] cursor-pointer"
          @click="removeScore(i)"
        >
          ✕
        </button>
      </div>
    </div>

    <div v-else class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm text-amber-600 dark:text-amber-400">
      No values — mean is NaN (0 / 0)
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
      @click="addScore"
    >
      + Add random score
    </button>
  </div>
</template>
