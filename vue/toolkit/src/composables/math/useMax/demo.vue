<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMax } from './index';

// A single reactive array — useMax resolves each item (which may itself be a
// ref/getter) and tracks changes to the array.
const samples = ref([42, 17, 88, 23, 64]);

const max = useMax(samples);

const maxIndex = computed(() => samples.value.indexOf(max.value));

function randomize() {
  const len = 3 + Math.floor(Math.random() * 4);
  samples.value = Array.from({ length: len }, () => Math.floor(Math.random() * 100));
}

function add() {
  samples.value.push(Math.floor(Math.random() * 100));
}

function removeAt(i: number) {
  samples.value.splice(i, 1);
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Maximum</span>
      <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
        {{ Number.isFinite(max) ? max : '−∞' }}
      </span>
      <span v-if="!samples.length" class="text-xs text-(--fg-subtle)">empty list → −Infinity</span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Values</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
            @click="add"
          >
            + add
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
            @click="randomize"
          >
            shuffle
          </button>
        </div>
      </div>

      <div v-if="samples.length" class="flex flex-col gap-2">
        <div
          v-for="(n, i) in samples"
          :key="i"
          class="flex items-center gap-2"
        >
          <div class="relative h-7 flex-1 overflow-hidden rounded-md bg-(--bg-inset)">
            <div
              class="h-full rounded-md transition-all"
              :class="i === maxIndex ? 'bg-(--accent)' : 'bg-(--accent-subtle)'"
              :style="{ width: `${Math.max(4, n)}%` }"
            />
            <span class="absolute inset-y-0 left-2 flex items-center font-mono text-xs font-medium tabular-nums text-(--fg)">
              {{ n }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-[0.98] cursor-pointer"
            aria-label="Remove value"
            @click="removeAt(i)"
          >
            &times;
          </button>
        </div>
      </div>
      <p v-else class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center text-sm text-(--fg-subtle)">
        No values &mdash; add some to compute a maximum.
      </p>
    </div>
  </div>
</template>
