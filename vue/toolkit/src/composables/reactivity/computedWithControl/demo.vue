<script setup lang="ts">
import { ref } from 'vue';
import { computedWithControl } from './index';

// `source` controls recomputation; `tax` deliberately does NOT.
const source = ref(100);
const tax = ref(0);
let recomputes = 0;

const total = computedWithControl(source, () => {
  recomputes++;
  return Math.round(source.value * (1 + tax.value / 100));
});

const peeked = ref<number | null>(null);
const detached = ref(false);

function peek() {
  // Read the cached value without registering tracking or recomputing.
  peeked.value = total.peek();
}

function stop() {
  total.stop();
  detached.value = true;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="demo-label">Base price (tracked)</span>
          <span class="font-mono text-sm tabular-nums text-accent-text">{{ source }}</span>
        </div>
        <input
          v-model.number="source"
          type="range"
          min="0"
          max="500"
          step="10"
          class="w-full accent-accent"
        >
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="demo-label">Tax % (untracked)</span>
          <span class="font-mono text-sm tabular-nums text-fg-muted">{{ tax }}</span>
        </div>
        <input
          v-model.number="tax"
          type="range"
          min="0"
          max="30"
          step="1"
          class="w-full accent-fg-muted"
        >
        <span class="text-xs text-fg-subtle">
          Changing tax alone won't recompute — trigger to pull it in.
        </span>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 flex items-center justify-between">
      <span class="demo-label">Total</span>
      <span class="demo-stat text-3xl">{{ total }}</span>
    </div>

    <div class="grid grid-cols-3 gap-1.5">
      <button
        type="button"
        class="demo-btn-primary"
        @click="total.trigger()"
      >
        Trigger
      </button>
      <button
        type="button"
        class="demo-btn"
        @click="peek"
      >
        Peek
      </button>
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="detached"
        @click="stop"
      >
        Stop
      </button>
    </div>

    <div class="flex flex-col gap-1.5 text-sm">
      <div class="flex items-center justify-between">
        <span class="text-fg-muted">Getter runs</span>
        <span class="font-mono tabular-nums text-fg">{{ recomputes }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-fg-muted">Last peek</span>
        <span class="font-mono tabular-nums text-fg">{{ peeked ?? '—' }}</span>
      </div>
      <div v-if="detached" class="text-xs text-amber-600 dark:text-amber-400">
        Source watcher stopped — only Trigger updates the total now.
      </div>
    </div>
  </div>
</template>
