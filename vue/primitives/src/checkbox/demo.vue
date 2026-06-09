<script setup lang="ts">
import type { CheckedState } from '@robonen/primitives';
import { CheckboxIndicator, CheckboxRoot } from '@robonen/primitives';
import { computed, ref } from 'vue';

const ingredients = [
  { id: 'cheese', label: 'Extra cheese' },
  { id: 'mushrooms', label: 'Mushrooms' },
  { id: 'olives', label: 'Olives' },
];

const selected = ref<Record<string, boolean>>({
  cheese: true,
  mushrooms: false,
  olives: false,
});

const checkedCount = computed(() => Object.values(selected.value).filter(Boolean).length);

// Parent reflects the children: checked when all, unchecked when none, else indeterminate.
const allChecked = computed<CheckedState>(() => {
  if (checkedCount.value === 0) return false;
  if (checkedCount.value === ingredients.length) return true;
  return 'indeterminate';
});

function toggleAll(next: CheckedState) {
  const value = next === true;
  for (const item of ingredients) selected.value[item.id] = value;
}

const acceptedTerms = ref(false);
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-sm bg-(--bg) text-(--fg) border border-(--border) rounded-xl">
    <fieldset class="flex flex-col gap-3 m-0 p-0 border-0">
      <legend class="text-sm font-semibold text-(--fg)">
        Toppings
      </legend>

      <label class="flex items-center gap-3 cursor-pointer select-none">
        <CheckboxRoot
          :checked="allChecked"
          class="grid place-items-center w-5 h-5 rounded-md border border-(--border) bg-(--bg-inset) outline-none transition-colors data-[state=checked]:bg-(--accent) data-[state=indeterminate]:bg-(--accent) data-[state=checked]:border-(--accent) data-[state=indeterminate]:border-(--accent) focus-visible:ring-2 focus-visible:ring-(--ring)"
          @checked-change="toggleAll"
        >
          <CheckboxIndicator v-slot="{ checked }" class="text-(--accent-fg)">
            <svg v-if="checked === 'indeterminate'" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </CheckboxIndicator>
        </CheckboxRoot>
        <span class="text-sm font-medium">Select all</span>
        <span class="ml-auto text-xs text-(--fg-subtle)">{{ checkedCount }}/{{ ingredients.length }}</span>
      </label>

      <div class="flex flex-col gap-2 pl-2 border-l border-(--border)">
        <label v-for="item in ingredients" :key="item.id" class="flex items-center gap-3 cursor-pointer select-none">
          <CheckboxRoot
            v-model:checked="selected[item.id]"
            class="grid place-items-center w-5 h-5 rounded-md border border-(--border) bg-(--bg-inset) outline-none transition-colors data-[state=checked]:bg-(--accent) data-[state=checked]:border-(--accent) focus-visible:ring-2 focus-visible:ring-(--ring)"
          >
            <CheckboxIndicator class="text-(--accent-fg)">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </CheckboxIndicator>
          </CheckboxRoot>
          <span class="text-sm text-(--fg)">{{ item.label }}</span>
        </label>
      </div>
    </fieldset>

    <label class="flex items-start gap-3 cursor-pointer select-none">
      <CheckboxRoot
        v-model:checked="acceptedTerms"
        required
        class="grid place-items-center w-5 h-5 mt-0.5 rounded-md border border-(--border) bg-(--bg-inset) outline-none transition-colors data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-400 dark:data-[state=checked]:border-emerald-400 focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <CheckboxIndicator class="text-white dark:text-(--bg)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </CheckboxIndicator>
      </CheckboxRoot>
      <span class="text-sm text-(--fg-muted)">I accept the terms and conditions</span>
    </label>

    <p
      class="text-xs"
      :class="acceptedTerms ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-subtle)'"
    >
      {{ acceptedTerms ? 'Ready to submit' : 'Please accept the terms to continue' }}
    </p>
  </div>
</template>
