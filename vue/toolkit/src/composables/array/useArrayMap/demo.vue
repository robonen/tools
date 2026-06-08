<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrayMap } from './index';

interface Product {
  name: string;
  price: number;
}

const products = ref<Product[]>([
  { name: 'Mechanical keyboard', price: 129 },
  { name: 'Ultrawide monitor', price: 549 },
  { name: 'Noise-cancelling headset', price: 299 },
  { name: 'Standing desk', price: 419 },
]);

const taxRate = ref(8);

// Reactive Array.prototype.map — recomputes when products or taxRate change.
const priced = useArrayMap(products, (product) => {
  const gross = product.price * (1 + taxRate.value / 100);
  return { ...product, gross };
});

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const total = computed(() => priced.value.reduce((sum, p) => sum + p.gross, 0));

function bump(index: number, delta: number) {
  const next = products.value.slice();
  next[index] = { ...next[index], price: Math.max(0, next[index].price + delta) };
  products.value = next;
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Cart</span>
      <label class="flex items-center gap-2 text-sm text-(--fg-muted)">
        Tax {{ taxRate }}%
        <input
          v-model.number="taxRate"
          type="range"
          min="0"
          max="25"
          class="accent-(--accent)"
        >
      </label>
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(item, index) in priced"
        :key="item.name"
        class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-(--fg)">
            {{ item.name }}
          </p>
          <p class="text-xs text-(--fg-subtle)">
            base {{ formatter.format(item.price) }}
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer"
            aria-label="Decrease price"
            @click="bump(index, -10)"
          >
            &minus;
          </button>
          <button
            class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer"
            aria-label="Increase price"
            @click="bump(index, 10)"
          >
            +
          </button>
        </div>
        <span class="w-20 text-right font-mono text-sm tabular-nums text-(--fg)">
          {{ formatter.format(item.gross) }}
        </span>
      </li>
    </ul>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Total with tax</span>
      <span class="font-mono text-xl font-bold tabular-nums text-(--fg)">
        {{ formatter.format(total) }}
      </span>
    </div>
  </div>
</template>
