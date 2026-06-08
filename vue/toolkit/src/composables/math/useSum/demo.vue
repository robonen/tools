<script setup lang="ts">
import { ref } from 'vue';
import { useSum } from './index';

interface LineItem {
  id: number;
  label: string;
  amount: number;
}

let nextId = 4;
const items = ref<LineItem[]>([
  { id: 1, label: 'Domain renewal', amount: 12.99 },
  { id: 2, label: 'Cloud hosting', amount: 24.5 },
  { id: 3, label: 'Email service', amount: 6.0 },
]);

// useSum reads a reactive array of getters, recomputing as items mutate.
const total = useSum(() => items.value.map(item => () => item.amount));

function addItem() {
  items.value.push({ id: nextId++, label: 'New item', amount: 0 });
}

function removeItem(id: number) {
  items.value = items.value.filter(item => item.id !== id);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">monthly total</span>
        <span class="text-xs text-(--fg-subtle)">{{ items.length }} item{{ items.length === 1 ? '' : 's' }}</span>
      </div>
      <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">${{ total.toFixed(2) }}</span>
    </div>

    <div class="space-y-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) p-2"
      >
        <input
          v-model="item.label"
          type="text"
          class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-(--fg) transition focus:border-(--accent) focus:bg-(--bg) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <div class="flex items-center text-sm text-(--fg-subtle)">
          <span class="font-mono">$</span>
          <input
            v-model.number="item.amount"
            type="number"
            step="0.01"
            class="w-20 rounded-md border border-(--border) bg-(--bg) px-2 py-1 text-right font-mono text-sm tabular-nums text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </div>
        <button
          type="button"
          aria-label="Remove item"
          class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg-muted) transition hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400 active:scale-[0.98] cursor-pointer"
          @click="removeItem(item.id)"
        >
          &times;
        </button>
      </div>

      <p v-if="!items.length" class="rounded-lg border border-dashed border-(--border) bg-(--bg-inset) p-4 text-center text-sm text-(--fg-subtle)">
        No items — total is ${{ total.toFixed(2) }}
      </p>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="addItem"
    >
      + Add item
    </button>
  </div>
</template>
