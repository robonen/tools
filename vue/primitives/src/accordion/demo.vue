<script setup lang="ts">
import { ref } from 'vue';
import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@robonen/primitives';

const open = ref<string>('shipping');

const items = [
  {
    value: 'shipping',
    question: 'How long does shipping take?',
    answer: 'Orders ship within 1–2 business days and arrive in 3–5 days with standard delivery. Express options are offered at checkout.',
  },
  {
    value: 'returns',
    question: 'What is your return policy?',
    answer: 'Returns are free within 30 days of delivery. Items must be unused and in their original packaging.',
  },
  {
    value: 'support',
    question: 'How can I reach support?',
    answer: 'Our team is available 24/7 by email and weekdays 9–5 by live chat. Most tickets are answered within a few hours.',
  },
];
</script>

<template>
  <AccordionRoot
    v-model="open"
    type="single"
    collapsible
    class="w-full max-w-md divide-y divide-(--border) rounded-lg border border-(--border) bg-(--bg) text-(--fg)"
  >
    <AccordionItem
      v-for="item in items"
      :key="item.value"
      :value="item.value"
    >
      <AccordionTrigger
        class="group flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm font-medium outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <span>{{ item.question }}</span>
        <svg
          class="size-4 shrink-0 text-(--fg-subtle) transition-transform duration-200 group-data-[state=open]:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </AccordionTrigger>
      <AccordionContent
        class="px-4 pb-4 text-sm text-(--fg-muted)"
      >
        {{ item.answer }}
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
