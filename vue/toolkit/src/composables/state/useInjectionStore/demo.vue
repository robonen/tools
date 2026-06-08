<script setup lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useInjectionStore } from './index';

// Define a store once: a shared cart state with a derived total.
const { useProvidingState, useInjectedState } = useInjectionStore(() => {
  const items = ref<Array<{ name: string; price: number }>>([
    { name: 'Mechanical keyboard', price: 89 },
    { name: 'USB-C hub', price: 35 },
  ]);

  const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));

  function add(name: string, price: number) {
    items.value.push({ name, price });
  }

  function remove(index: number) {
    items.value.splice(index, 1);
  }

  return { items, total, add, remove };
});

// The parent provides the state for its subtree.
const cart = useProvidingState();

const draftName = ref('Wrist rest');
const draftPrice = ref(19);

function addDraft() {
  const name = draftName.value.trim();
  if (name)
    cart.add(name, Number(draftPrice.value) || 0);
}

// A nested child component injects the SAME store instance — no props drilled.
const Summary = defineComponent({
  setup() {
    const injected = useInjectedState();
    return { injected };
  },
  template: `
    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Injected in child</span>
        <span class="text-xs text-(--fg-subtle)">{{ injected.items.length }} items</span>
      </div>
      <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">\${{ injected.total }}</span>
    </div>
  `,
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Cart (provided here)</span>
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="(item, i) in cart.items"
          :key="i"
          class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-1.5"
        >
          <span class="truncate text-sm text-(--fg)">{{ item.name }}</span>
          <div class="flex shrink-0 items-center gap-2">
            <span class="font-mono text-sm tabular-nums text-(--fg-muted)">${{ item.price }}</span>
            <button
              type="button"
              aria-label="Remove item"
              class="rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
              @click="cart.remove(i)"
            >
              ✕
            </button>
          </div>
        </li>
        <li v-if="!cart.items.length" class="rounded-lg border border-dashed border-(--border) px-3 py-4 text-center text-sm text-(--fg-subtle)">
          Cart is empty
        </li>
      </ul>
    </div>

    <div class="flex gap-2">
      <input
        v-model="draftName"
        type="text"
        placeholder="Item name"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        @keydown.enter="addDraft"
      >
      <input
        v-model.number="draftPrice"
        type="number"
        min="0"
        aria-label="Price"
        class="w-20 shrink-0 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) tabular-nums transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        @keydown.enter="addDraft"
      >
      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="addDraft"
      >
        Add
      </button>
    </div>

    <Summary />

    <p class="text-xs text-(--fg-subtle)">
      The parent calls <span class="font-mono">useProvidingState()</span>; the nested summary calls
      <span class="font-mono">useInjectedState()</span> and reads the very same reactive cart.
    </p>
  </div>
</template>
