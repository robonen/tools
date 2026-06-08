<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMath } from './index';

const a = ref(3);
const b = ref(4);

// Reactive wrappers over Math methods. Each recomputes when a or b change.
const hypot = useMath('hypot', a, b);
const max = useMath('max', a, b);
const min = useMath('min', a, b);
const pow = useMath('pow', a, b);

// A single-argument method driven by a getter.
const sqrtOfA = useMath('sqrt', () => a.value);

const results = computed(() => [
  { label: 'hypot(a, b)', expr: '√(a² + b²)', value: hypot.value },
  { label: 'pow(a, b)', expr: 'aᵇ', value: pow.value },
  { label: 'max(a, b)', expr: 'larger', value: max.value },
  { label: 'min(a, b)', expr: 'smaller', value: min.value },
  { label: 'sqrt(a)', expr: '√a', value: sqrtOfA.value },
]);

function fmt(n: number) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(3);
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">a = {{ a }}</span>
        <input
          v-model.number="a"
          type="range"
          min="0"
          max="12"
          step="1"
          class="w-full accent-(--accent)"
        >
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">b = {{ b }}</span>
        <input
          v-model.number="b"
          type="range"
          min="0"
          max="12"
          step="1"
          class="w-full accent-(--accent)"
        >
      </label>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) divide-y divide-(--border)">
      <div
        v-for="r in results"
        :key="r.label"
        class="flex items-center justify-between gap-3 px-4 py-2.5"
      >
        <div class="flex flex-col">
          <span class="font-mono text-sm text-(--fg)">{{ r.label }}</span>
          <span class="text-xs text-(--fg-subtle)">{{ r.expr }}</span>
        </div>
        <span class="font-mono text-lg font-semibold tabular-nums text-(--fg)">{{ fmt(r.value) }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Every value above is a single <code class="font-mono">useMath('&lt;key&gt;', ...)</code> computed &mdash; any callable
      <code class="font-mono">Math</code> method works, with refs, getters or plain values as arguments.
    </p>
  </div>
</template>
