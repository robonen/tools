<script setup lang="ts">
import { computed } from 'vue';
import { broadcastedRef } from './index';

interface CartState {
  item: string;
  quantity: number;
}

const products = ['Mechanical Keyboard', 'USB-C Hub', 'Desk Mat', 'Wrist Rest'];

// Synced across every open tab via BroadcastChannel
const cart = broadcastedRef<CartState>('docs-demo-cart', { item: products[0], quantity: 1 }, { immediate: true });
const theme = broadcastedRef<'light' | 'dark'>('docs-demo-theme', 'light');

const supported = typeof BroadcastChannel !== 'undefined';

const subtotal = computed(() => cart.value.quantity * 49);

function pick(item: string): void {
  cart.value = { ...cart.value, item };
}

function setQuantity(delta: number): void {
  cart.value = { ...cart.value, quantity: Math.max(1, cart.value.quantity + delta) };
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Shared cart</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="supported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="supported ? 'bg-emerald-500' : 'bg-amber-500'" />
        {{ supported ? 'Broadcasting' : 'Not supported' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="product in products"
          :key="product"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="cart.item === product
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="pick(product)"
        >
          {{ product }}
        </button>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <span class="text-sm text-(--fg-muted)">Quantity</span>
        <div class="flex items-center gap-2">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="cart.quantity <= 1"
            @click="setQuantity(-1)"
          >
            &minus;
          </button>
          <span class="w-8 text-center font-mono text-lg font-bold tabular-nums text-(--fg)">{{ cart.quantity }}</span>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
            @click="setQuantity(1)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex justify-between">
        <span class="text-(--fg-muted)">{{ cart.item }} &times; {{ cart.quantity }}</span>
        <span class="font-bold">${{ subtotal }}</span>
      </div>
    </div>

    <button
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="theme = theme === 'light' ? 'dark' : 'light'"
    >
      Toggle shared theme: <span class="font-mono">{{ theme }}</span>
    </button>

    <p class="text-xs text-(--fg-subtle)">
      Open this page in a second tab. Every change you make here is broadcast and mirrored instantly in the other tab.
    </p>
  </div>
</template>
