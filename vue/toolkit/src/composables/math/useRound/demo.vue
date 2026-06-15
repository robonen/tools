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
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4">
      <div class="flex items-baseline justify-between">
        <span class="demo-label">rounded</span>
        <span class="font-mono text-xs text-fg-subtle">{{ hint }}</span>
      </div>
      <div class="demo-stat mt-1 text-3xl">
        {{ rounded }}
      </div>
      <div class="mt-1 font-mono text-xs text-fg-subtle">
        input {{ value }}
      </div>
    </div>

    <div class="demo-card p-4">
      <label class="block text-sm font-medium text-fg" for="round-value">Value</label>
      <input
        id="round-value"
        v-model.number="value"
        type="number"
        step="0.0001"
        class="demo-input mt-2"
      >

      <label class="mt-4 flex items-center justify-between text-sm font-medium text-fg">
        <span>Digits</span>
        <span
          class="font-mono tabular-nums"
          :class="digits === 0 ? 'text-fg-muted' : 'text-accent-text'"
        >{{ digits > 0 ? '+' : '' }}{{ digits }}</span>
      </label>
      <input
        v-model.number="digits"
        type="range"
        min="-3"
        max="4"
        step="1"
        class="mt-2 w-full accent-accent"
      >
      <div class="mt-1 flex justify-between font-mono text-xs text-fg-subtle">
        <span>tens</span>
        <span>integer</span>
        <span>decimals</span>
      </div>
    </div>
  </div>
</template>
