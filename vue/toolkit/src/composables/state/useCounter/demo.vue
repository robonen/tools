<script setup lang="ts">
import { computed } from 'vue';
import { useCounter } from './index';

// Bounded counter: a quantity selector that never escapes 0..12.
const MIN = 0;
const MAX = 12;

const { count, increment, decrement, set, reset } = useCounter(3, { min: MIN, max: MAX });

const atMin = computed(() => count.value <= MIN);
const atMax = computed(() => count.value >= MAX);
const fillPercent = computed(() => ((count.value - MIN) / (MAX - MIN)) * 100);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Tickets</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ MIN }} – {{ MAX }}
        </span>
      </div>

      <!-- Big live readout with stepper controls -->
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          :disabled="atMin"
          aria-label="Decrement"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) size-11 text-lg font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="decrement()"
        >
          −
        </button>

        <div class="flex flex-col items-center">
          <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ count }}</span>
          <span class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">in cart</span>
        </div>

        <button
          type="button"
          :disabled="atMax"
          aria-label="Increment"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) size-11 text-lg font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="increment()"
        >
          +
        </button>
      </div>

      <!-- Visual clamp feedback -->
      <div class="h-2 overflow-hidden rounded-full border border-(--border) bg-(--bg-inset)">
        <div
          class="h-full rounded-full bg-(--accent) transition-all duration-200"
          :style="{ width: `${fillPercent}%` }"
        />
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Step actions</span>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          :disabled="atMax"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="increment(5)"
        >
          +5
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="set(MAX)"
        >
          Max
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="reset()"
        >
          Reset
        </button>
      </div>
      <p class="text-xs text-(--fg-subtle)">
        Values are clamped to <span class="font-mono text-(--fg-muted)">{{ MIN }}–{{ MAX }}</span> — try +5 near the top.
      </p>
    </div>
  </div>
</template>
