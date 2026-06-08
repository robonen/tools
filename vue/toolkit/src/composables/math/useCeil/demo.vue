<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCeil } from './index';

const value = ref(7.25);
const ceiled = useCeil(value);

// Fractional part drives a little fill bar so rounding "up" feels visual.
const fraction = computed(() => {
  const f = value.value - Math.floor(value.value);
  return Math.min(Math.max(f, 0), 1);
});

function step(delta: number) {
  value.value = Math.round((value.value + delta) * 100) / 100;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">value</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrement"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="step(-0.25)"
        >−</button>
        <input
          v-model.number="value"
          type="number"
          step="0.25"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-center font-mono text-sm text-(--fg) tabular-nums transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <button
          type="button"
          aria-label="Increment"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="step(0.25)"
        >+</button>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="mb-2 flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Math.ceil</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ ceiled }}</span>
      </div>
      <div class="relative h-2 overflow-hidden rounded-full bg-(--bg-inset)">
        <div
          class="h-full rounded-full bg-(--accent) transition-[width] duration-150"
          :style="{ width: `${fraction * 100}%` }"
        />
      </div>
      <div class="mt-1.5 flex justify-between font-mono text-xs text-(--fg-subtle) tabular-nums">
        <span>{{ Math.floor(value) }}</span>
        <span class="text-(--accent-text)">{{ ceiled }}</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center font-mono text-sm text-(--fg) tabular-nums">
      Math.ceil({{ value }}) = {{ ceiled }}
    </div>
  </div>
</template>
