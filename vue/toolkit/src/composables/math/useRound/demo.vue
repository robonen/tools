<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRound } from './index';

const value = ref(1234.5678);
const digits = ref(2);

const rounded = useRound(value, { digits });

const hint = computed(() => {
  if (digits.value > 0)
    return `to ${digits.value} decimal place${digits.value === 1 ? '' : 's'}`;
  if (digits.value < 0)
    return `to nearest ${10 ** -digits.value}`;
  return 'to nearest integer (Math.round)';
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">rounded</span>
        <span class="font-mono text-xs text-(--fg-subtle)">{{ hint }}</span>
      </div>
      <div class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">
        {{ rounded }}
      </div>
      <div class="mt-1 font-mono text-xs text-(--fg-subtle)">
        input {{ value }}
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <label class="block text-sm font-medium text-(--fg)" for="round-value">Value</label>
      <input
        id="round-value"
        v-model.number="value"
        type="number"
        step="0.0001"
        class="mt-2 w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >

      <label class="mt-4 flex items-center justify-between text-sm font-medium text-(--fg)">
        <span>Digits</span>
        <span
          class="font-mono tabular-nums"
          :class="digits === 0 ? 'text-(--fg-muted)' : 'text-(--accent-text)'"
        >{{ digits > 0 ? '+' : '' }}{{ digits }}</span>
      </label>
      <input
        v-model.number="digits"
        type="range"
        min="-3"
        max="4"
        step="1"
        class="mt-2 w-full accent-(--accent)"
      >
      <div class="mt-1 flex justify-between font-mono text-xs text-(--fg-subtle)">
        <span>tens</span>
        <span>integer</span>
        <span>decimals</span>
      </div>
    </div>
  </div>
</template>
