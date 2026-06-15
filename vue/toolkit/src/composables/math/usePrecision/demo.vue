<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePrecision } from './index';
import type { UsePrecisionMath } from './index';

const value = ref(3.14159);
const digits = ref(2);
const math = ref<UsePrecisionMath>('round');

const result = usePrecision(value, digits, computed(() => ({ math: math.value })));

const methods: ReadonlyArray<{ key: UsePrecisionMath; label: string }> = [
  { key: 'round', label: 'round' },
  { key: 'floor', label: 'floor' },
  { key: 'ceil', label: 'ceil' },
];

const samples = [3.14159, 0.1 + 0.2, 1234.5678, 9.999, 2.71828];

function pick(n: number) {
  value.value = n;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4">
      <div class="flex items-baseline justify-between">
        <span class="demo-label">precision result</span>
        <span class="font-mono text-xs text-fg-subtle">{{ digits }} digit{{ digits === 1 ? '' : 's' }}</span>
      </div>
      <div class="demo-stat mt-1 text-3xl">
        {{ result }}
      </div>
      <div class="mt-1 font-mono text-xs text-fg-subtle">
        from {{ value }}
      </div>
    </div>

    <div class="demo-card p-4">
      <label class="flex items-center justify-between text-sm font-medium text-fg">
        <span>Value</span>
        <span class="font-mono text-fg-muted">{{ value }}</span>
      </label>
      <input
        v-model.number="value"
        type="range"
        min="0"
        max="10"
        step="0.00001"
        class="mt-2 w-full accent-accent"
      >

      <label class="mt-4 flex items-center justify-between text-sm font-medium text-fg">
        <span>Digits</span>
        <span class="font-mono text-fg-muted">{{ digits }}</span>
      </label>
      <input
        v-model.number="digits"
        type="range"
        min="0"
        max="5"
        step="1"
        class="mt-2 w-full accent-accent"
      >
    </div>

    <div>
      <span class="demo-label">Rounding method</span>
      <div class="mt-2 grid grid-cols-3 gap-2">
        <button
          v-for="m in methods"
          :key="m.key"
          type="button"
          class="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="math === m.key
            ? 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover'
            : 'border-border bg-bg-elevated text-fg hover:bg-bg-inset hover:border-border-strong'"
          @click="math = m.key"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div>
      <span class="demo-label">Samples</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="(s, i) in samples"
          :key="i"
          type="button"
          class="demo-badge transition hover:border-border-strong hover:text-fg cursor-pointer"
          @click="pick(s)"
        >
          {{ s }}
        </button>
      </div>
    </div>
  </div>
</template>
