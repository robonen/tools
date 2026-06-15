<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { get } from './index';

// A reactive user record we read from in three different ways.
const user = reactive({
  name: 'Ada Lovelace',
  role: 'Mathematician',
  followers: 1843,
});

// A plain ref, edited live by the slider below.
const count = ref(42);

// A getter — `get` resolves it via `toValue`, just like a ref or plain value.
const doubled = (): number => count.value * 2;

// Pick which property of `user` to read with the key overload.
const keys = ['name', 'role', 'followers'] as const;
const selectedKey = ref<typeof keys[number]>('name');

// `get(ref)` unwraps the ref.
const countValue = computed(() => get(count));
// `get(getter)` resolves the getter function.
const doubledValue = computed(() => get(doubled));
// `get(reactive, key)` reads a single property off the resolved value.
const keyedValue = computed(() => get(user, selectedKey.value));
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex flex-col gap-1">
      <span class="demo-label">unwrap a ref</span>
      <div class="flex items-center gap-3">
        <input
          v-model.number="count"
          type="range"
          min="0"
          max="100"
          class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-bg-inset accent-accent"
        >
        <span class="font-mono text-sm tabular-nums text-fg-muted">{{ count }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="demo-card p-4">
        <p class="demo-label">get(count)</p>
        <p class="demo-stat mt-1 text-3xl">{{ countValue }}</p>
      </div>
      <div class="demo-card p-4">
        <p class="demo-label">get(getter)</p>
        <p class="demo-stat mt-1 text-3xl">{{ doubledValue }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="demo-label">read a single key</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="k in keys"
          :key="k"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="selectedKey === k
            ? 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover'
            : 'border-border bg-bg-elevated text-fg hover:bg-bg-inset hover:border-border-strong'"
          @click="selectedKey = k"
        >
          {{ k }}
        </button>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums">
        <span class="text-fg-subtle">get(user, '{{ selectedKey }}')</span>
        <span class="px-2 text-fg-subtle">→</span>
        <span class="text-accent-text">{{ JSON.stringify(keyedValue) }}</span>
      </div>
    </div>
  </div>
</template>
