<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrayFilter } from './index';

interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

const products = ref<Product[]>([
  { name: 'Mechanical Keyboard', price: 129, inStock: true },
  { name: 'USB-C Hub', price: 49, inStock: false },
  { name: '4K Monitor', price: 399, inStock: true },
  { name: 'Webcam', price: 79, inStock: true },
  { name: 'Desk Mat', price: 25, inStock: false },
  { name: 'Wireless Mouse', price: 59, inStock: true },
]);

const query = ref('');
const maxPrice = ref(400);
const inStockOnly = ref(true);

// Reactive filter: name match + price ceiling + stock toggle.
const visible = useArrayFilter(products, (product) => {
  const matchesName = product.name.toLowerCase().includes(query.value.trim().toLowerCase());
  const matchesPrice = product.price <= maxPrice.value;
  const matchesStock = !inStockOnly.value || product.inStock;
  return matchesName && matchesPrice && matchesStock;
});

const formatted = computed(() =>
  visible.value.map(p => ({ ...p, priceLabel: `$${p.price}` })),
);
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <input
      v-model="query"
      type="text"
      placeholder="Search products…"
      class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
    >

    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <label class="flex items-center justify-between text-sm text-(--fg-muted)">
        <span>Max price</span>
        <span class="font-mono text-(--fg) tabular-nums">${{ maxPrice }}</span>
      </label>
      <input
        v-model.number="maxPrice"
        type="range"
        min="25"
        max="400"
        step="5"
        class="h-1.5 w-full cursor-pointer accent-(--accent)"
      >
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-(--fg-muted)">
        <input
          v-model="inStockOnly"
          type="checkbox"
          class="size-4 cursor-pointer accent-(--accent)"
        >
        In stock only
      </label>
    </div>

    <div class="flex items-center justify-between text-xs">
      <span class="font-medium uppercase tracking-wide text-(--fg-subtle)">Results</span>
      <span class="font-mono tabular-nums text-(--fg-muted)">
        {{ formatted.length }} / {{ products.length }}
      </span>
    </div>

    <ul v-if="formatted.length" class="flex flex-col gap-2">
      <li
        v-for="product in formatted"
        :key="product.name"
        class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-(--fg)">{{ product.name }}</span>
          <span
            v-if="!product.inStock"
            class="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-600 dark:text-amber-400"
          >
            Out
          </span>
        </div>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ product.priceLabel }}</span>
      </li>
    </ul>
    <div
      v-else
      class="rounded-lg border border-dashed border-(--border) bg-(--bg-inset) px-3 py-6 text-center text-sm text-(--fg-subtle)"
    >
      No products match your filters.
    </div>
  </div>
</template>
