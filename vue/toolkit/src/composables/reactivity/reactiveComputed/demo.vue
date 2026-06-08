<script setup lang="ts">
import { ref } from 'vue';
import { reactiveComputed } from './index';

const price = ref(24);
const quantity = ref(3);
const discount = ref(10);

// One getter, exposed as a reactive object whose fields stay independently
// reactive — and writable back through to the source refs.
const cart = reactiveComputed(() => {
  const subtotal = price.value * quantity.value;
  const saved = Math.round((subtotal * discount.value) / 100);
  return {
    subtotal,
    saved,
    total: subtotal - saved,
    discount, // a ref — unwrapped and writable through the proxy
  };
});

const presets = [0, 10, 25, 50];

function setDiscount(value: number) {
  // Writes through the reactive proxy back to the `discount` ref.
  cart.discount = value;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Unit price</span>
          <input
            v-model.number="price"
            type="number"
            min="0"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) tabular-nums transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Quantity</span>
          <input
            v-model.number="quantity"
            type="number"
            min="1"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) tabular-nums transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Discount</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="p in presets"
            :key="p"
            type="button"
            class="inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition active:scale-[0.98] cursor-pointer"
            :class="cart.discount === p
              ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
              : 'border-(--border) bg-(--bg) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
            @click="setDiscount(p)"
          >
            {{ p }}%
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2 font-mono text-sm tabular-nums">
      <div class="flex items-center justify-between text-(--fg-muted)">
        <span>Subtotal</span>
        <span class="text-(--fg)">${{ cart.subtotal }}</span>
      </div>
      <div class="flex items-center justify-between text-(--fg-muted)">
        <span>Saved ({{ cart.discount }}%)</span>
        <span class="text-emerald-600 dark:text-emerald-400">-${{ cart.saved }}</span>
      </div>
      <div class="h-px bg-(--border)" />
      <div class="flex items-center justify-between">
        <span class="text-(--fg)">Total</span>
        <span class="text-2xl font-bold text-(--fg)">${{ cart.total }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Each field reads from a single cached getter; writing <code class="text-(--fg-muted)">cart.discount</code> flows back to the source ref.
    </p>
  </div>
</template>
