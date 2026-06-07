<script setup lang="ts">
import { ref } from 'vue';
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@primitives/accordion';

const value = ref<string | string[] | undefined>('a');
const type = ref<'single' | 'multiple'>('single');
const collapsible = ref(true);
const disabled = ref(false);

const items = [
  { value: 'a', title: 'Item A', body: 'First panel content.' },
  { value: 'b', title: 'Item B', body: 'Second panel content.' },
  { value: 'c', title: 'Item C', body: 'Third panel content.' },
];
</script>

<template>
  <section class="grid max-w-xl gap-4">
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
      <label class="inline-flex items-center gap-2">
        type
        <select v-model="type" class="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 dark:border-neutral-800 dark:bg-neutral-950">
          <option value="single">single</option>
          <option value="multiple">multiple</option>
        </select>
      </label>
      <label class="inline-flex items-center gap-1.5">
        <input v-model="collapsible" type="checkbox"> collapsible
      </label>
      <label class="inline-flex items-center gap-1.5">
        <input v-model="disabled" type="checkbox"> disabled
      </label>
      <output class="ml-auto font-mono text-xs text-neutral-500 dark:text-neutral-400">value = {{ JSON.stringify(value) }}</output>
    </div>

    <AccordionRoot
      v-model="value"
      class="grid gap-1"
      :type="type"
      :collapsible="collapsible"
      :disabled="disabled"
    >
      <AccordionItem
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
      >
        <AccordionTrigger
          class="block w-full cursor-pointer bg-white px-3 py-2.5 text-left data-[state=open]:bg-neutral-900/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:bg-neutral-900 dark:data-[state=open]:bg-neutral-100/5 dark:focus-visible:outline-blue-400"
        >
          {{ item.title }}
        </AccordionTrigger>
        <AccordionContent class="px-3 py-2.5 text-neutral-500 dark:text-neutral-400">
          {{ item.body }}
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  </section>
</template>
