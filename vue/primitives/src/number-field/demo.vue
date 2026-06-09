<script setup lang="ts">
import { NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput, NumberFieldRoot } from '@robonen/primitives';
import { computed, ref } from 'vue';

const UNIT_PRICE = 12;
const MAX = 10;

const quantity = ref<number | null>(2);

const total = computed(() => (quantity.value ?? 0) * UNIT_PRICE);
const atMax = computed(() => quantity.value !== null && quantity.value >= MAX);
</script>

<template>
  <div class="flex flex-col gap-5 p-6 max-w-xs bg-(--bg) text-(--fg) border border-(--border) rounded-xl">
    <div class="flex flex-col gap-1">
      <span class="text-sm font-semibold">Espresso blend</span>
      <span class="text-xs text-(--fg-subtle)">${{ UNIT_PRICE }}.00 per bag</span>
    </div>

    <label class="flex flex-col gap-2">
      <span class="text-xs font-medium text-(--fg-muted)">Quantity</span>

      <NumberFieldRoot
        v-model="quantity"
        :min="1"
        :max="MAX"
        :step="1"
        class="inline-flex items-center w-fit rounded-lg border border-(--border) bg-(--bg-inset) overflow-hidden focus-within:ring-2 focus-within:ring-(--ring) data-[disabled]:opacity-50"
      >
        <NumberFieldDecrement
          class="grid place-items-center w-9 h-9 text-(--fg-muted) hover:bg-(--bg-subtle) hover:text-(--fg) transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </NumberFieldDecrement>

        <NumberFieldInput
          name="quantity"
          placeholder="0"
          class="w-12 h-9 text-center text-sm font-medium bg-transparent text-(--fg) outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />

        <NumberFieldIncrement
          class="grid place-items-center w-9 h-9 text-(--fg-muted) hover:bg-(--bg-subtle) hover:text-(--fg) transition-colors disabled:pointer-events-none disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </NumberFieldIncrement>
      </NumberFieldRoot>
    </label>

    <div class="flex items-center justify-between pt-3 border-t border-(--border)">
      <span class="text-sm text-(--fg-muted)">Total</span>
      <span class="text-sm font-semibold tabular-nums">${{ total }}.00</span>
    </div>

    <p
      class="text-xs"
      :class="atMax ? 'text-red-600 dark:text-red-400' : 'text-(--fg-subtle)'"
    >
      {{ atMax ? `Maximum of ${MAX} bags per order` : 'Use the arrow keys or buttons to adjust' }}
    </p>
  </div>
</template>
