<script setup lang="ts">
import { ref } from 'vue';
import { useArrayReduce } from './index';

interface Expense {
  label: string;
  amount: number;
}

const expenses = ref<Expense[]>([
  { label: 'Cloud hosting', amount: 86 },
  { label: 'Domain renewal', amount: 18 },
  { label: 'Design assets', amount: 42 },
  { label: 'Coffee', amount: 7 },
]);

// A reactive seed: the running balance grows as you raise the starting budget.
const startingBudget = ref(500);

// Reactive Array.prototype.reduce with a reactive initial value.
const remaining = useArrayReduce(
  expenses,
  (balance, expense) => balance - expense.amount,
  startingBudget,
);

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function add() {
  expenses.value = [...expenses.value, { label: 'New charge', amount: 25 }];
}

function removeAt(index: number) {
  expenses.value = expenses.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <label class="flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Starting budget</span>
      <input
        v-model.number="startingBudget"
        type="number"
        step="50"
        class="w-28 rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-right font-mono text-sm tabular-nums text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(expense, index) in expenses"
        :key="index"
        class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2"
      >
        <span class="flex-1 truncate text-sm text-(--fg)">{{ expense.label }}</span>
        <span class="font-mono text-sm tabular-nums text-rose-600 dark:text-rose-400">
          &minus;{{ formatter.format(expense.amount) }}
        </span>
        <button
          class="inline-flex size-6 items-center justify-center rounded-md text-(--fg-subtle) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-[0.98] cursor-pointer"
          aria-label="Remove expense"
          @click="removeAt(index)"
        >
          &times;
        </button>
      </li>
      <li v-if="expenses.length === 0" class="rounded-lg border border-dashed border-(--border) px-3 py-4 text-center text-sm text-(--fg-subtle)">
        No expenses — full budget remains.
      </li>
    </ul>

    <button
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="add"
    >
      + Add charge
    </button>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Remaining</span>
      <span
        class="font-mono text-2xl font-bold tabular-nums"
        :class="remaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'"
      >
        {{ formatter.format(remaining) }}
      </span>
    </div>
  </div>
</template>
