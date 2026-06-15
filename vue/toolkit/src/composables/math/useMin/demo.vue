<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMin } from './index';

// A single reactive array — useMin resolves each item (refs/getters allowed)
// and recomputes whenever the array changes.
const samples = ref([42, 17, 88, 23, 64]);

const min = useMin(samples);

const minIndex = computed(() => samples.value.indexOf(min.value));

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
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col items-center gap-1">
      <span class="demo-label">Minimum</span>
      <span class="demo-stat text-3xl">
        {{ Number.isFinite(min) ? min : '∞' }}
      </span>
      <span v-if="!samples.length" class="text-xs text-fg-subtle">empty list → Infinity</span>
    </div>

    <div class="demo-card p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="demo-label">Values</span>
        <div class="flex gap-2">
          <button
            type="button"
            class="demo-btn"
            @click="add"
          >
            + add
          </button>
          <button
            type="button"
            class="demo-btn-primary"
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
          <div class="relative h-7 flex-1 overflow-hidden rounded-md bg-bg-inset">
            <div
              class="h-full rounded-md transition-all"
              :class="i === minIndex ? 'bg-emerald-500' : 'bg-accent-subtle'"
              :style="{ width: `${Math.max(4, n)}%` }"
            />
            <span class="absolute inset-y-0 left-2 flex items-center font-mono text-xs font-medium tabular-nums text-fg">
              {{ n }}
            </span>
          </div>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md border border-border bg-bg-elevated text-fg-muted transition hover:bg-bg-inset hover:text-fg active:scale-[0.98] cursor-pointer"
            aria-label="Remove value"
            @click="removeAt(i)"
          >
            &times;
          </button>
        </div>
      </div>
      <p v-else class="rounded-lg border border-border bg-bg-inset p-3 text-center text-sm text-fg-subtle">
        No values &mdash; add some to compute a minimum.
      </p>
    </div>
  </div>
</template>
