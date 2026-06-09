<script setup lang="ts">
import { computed, ref } from 'vue';

import {
  ListboxContent,
  ListboxFilter,
  ListboxGroup,
  ListboxGroupLabel,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot,
} from '@robonen/primitives';

interface Fruit {
  value: string;
  label: string;
  group: 'Citrus' | 'Berries';
}

const fruits: Fruit[] = [
  { value: 'orange', label: 'Orange', group: 'Citrus' },
  { value: 'lemon', label: 'Lemon', group: 'Citrus' },
  { value: 'lime', label: 'Lime', group: 'Citrus' },
  { value: 'strawberry', label: 'Strawberry', group: 'Berries' },
  { value: 'blueberry', label: 'Blueberry', group: 'Berries' },
  { value: 'raspberry', label: 'Raspberry', group: 'Berries' },
];

const selected = ref<string[]>(['lemon']);
const query = ref('');

const groups = ['Citrus', 'Berries'] as const;

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? fruits.filter(f => f.label.toLowerCase().includes(q)) : fruits;
});

function itemsFor(group: (typeof groups)[number]) {
  return filtered.value.filter(f => f.group === group);
}

function labelFor(value: string) {
  return fruits.find(f => f.value === value)?.label ?? value;
}
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3">
    <ListboxRoot
      v-model="selected"
      multiple
      highlight-on-hover
      class="overflow-hidden rounded-lg border border-(--border) bg-(--bg-elevated)"
    >
      <div class="border-b border-(--border) p-2">
        <ListboxFilter
          v-model="query"
          placeholder="Filter fruit..."
          class="w-full rounded-md border border-(--border) bg-(--bg-inset) px-2.5 py-1.5 text-sm text-(--fg) outline-none placeholder:text-(--fg-subtle) focus:border-(--accent) focus:ring-2 focus:ring-(--ring)"
        />
      </div>

      <ListboxContent class="max-h-64 overflow-y-auto p-1 outline-none">
        <p
          v-if="filtered.length === 0"
          class="px-3 py-6 text-center text-sm text-(--fg-subtle)"
        >
          No fruit found.
        </p>

        <ListboxGroup
          v-for="group in groups"
          v-show="itemsFor(group).length"
          :key="group"
          class="mb-1 last:mb-0"
        >
          <ListboxGroupLabel
            class="px-2 py-1 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)"
          >
            {{ group }}
          </ListboxGroupLabel>

          <ListboxItem
            v-for="fruit in itemsFor(group)"
            :key="fruit.value"
            :value="fruit.value"
            class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-(--fg) outline-none data-[highlighted]:bg-(--bg-subtle) data-[state=checked]:text-(--accent) data-[disabled]:opacity-50"
          >
            <span>{{ fruit.label }}</span>
            <ListboxItemIndicator class="text-(--accent)">
              <span aria-hidden="true">✓</span>
            </ListboxItemIndicator>
          </ListboxItem>
        </ListboxGroup>
      </ListboxContent>
    </ListboxRoot>

    <p class="text-sm text-(--fg-muted)">
      Selected:
      <span class="font-medium text-(--fg)">
        {{ selected.length ? selected.map(labelFor).join(', ') : 'none' }}
      </span>
    </p>
  </div>
</template>
