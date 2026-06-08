<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrayFind } from './index';

interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

const catalog = ref<Product[]>([
  { id: 1, name: 'Mechanical Keyboard', price: 129, inStock: false },
  { id: 2, name: 'USB-C Hub', price: 49, inStock: true },
  { id: 3, name: 'Desk Mat', price: 24, inStock: true },
  { id: 4, name: '4K Monitor', price: 399, inStock: true },
  { id: 5, name: 'Webcam', price: 89, inStock: false },
]);

const maxPrice = ref(100);
const inStockOnly = ref(true);

// Reactive Array.prototype.find — re-evaluates when the list, the price
// threshold or the toggle change.
const firstMatch = useArrayFind(
  catalog,
  product =>
    product.price <= maxPrice.value
    && (!inStockOnly.value || product.inStock),
);

const matchIndex = computed(() =>
  firstMatch.value ? catalog.value.indexOf(firstMatch.value) : -1,
);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="maxPrice">
          Max price
        </label>
        <span class="font-mono text-sm tabular-nums text-(--fg)">${{ maxPrice }}</span>
      </div>
      <input
        id="maxPrice"
        v-model.number="maxPrice"
        type="range"
        min="20"
        max="400"
        step="5"
        class="w-full accent-(--accent)"
      >
      <label class="flex cursor-pointer items-center gap-2 text-sm text-(--fg-muted)">
        <input v-model="inStockOnly" type="checkbox" class="accent-(--accent)">
        In stock only
      </label>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        First match
      </p>
      <template v-if="firstMatch">
        <div class="flex items-baseline justify-between">
          <span class="text-sm font-medium text-(--fg)">{{ firstMatch.name }}</span>
          <span class="font-mono text-sm tabular-nums text-(--fg)">${{ firstMatch.price }}</span>
        </div>
        <p class="mt-1 font-mono text-xs text-(--fg-subtle)">
          index {{ matchIndex }} · id {{ firstMatch.id }}
        </p>
      </template>
      <p v-else class="text-sm text-(--fg-subtle)">
        No product matches the filters
      </p>
    </div>

    <ul class="flex flex-col gap-1.5">
      <li
        v-for="product in catalog"
        :key="product.id"
        class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        :class="product.id === firstMatch?.id
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg-muted)'"
      >
        <span class="flex items-center gap-2">
          {{ product.name }}
          <span
            v-if="!product.inStock"
            class="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            out of stock
          </span>
        </span>
        <span class="font-mono tabular-nums">${{ product.price }}</span>
      </li>
    </ul>
  </div>
</template>
