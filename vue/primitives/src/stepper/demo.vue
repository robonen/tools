<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperRoot,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@robonen/primitives';

const steps = [
  { step: 1, title: 'Account', description: 'Your details' },
  { step: 2, title: 'Shipping', description: 'Delivery address' },
  { step: 3, title: 'Payment', description: 'Card or PayPal' },
  { step: 4, title: 'Review', description: 'Confirm order' },
];

const current = ref(1);
const isLast = computed(() => current.value === steps.length);

function next() {
  if (current.value < steps.length) current.value++;
}

function prev() {
  if (current.value > 1) current.value--;
}
</script>

<template>
  <div class="w-full max-w-xl text-(--fg)">
    <StepperRoot
      v-model="current"
      class="flex items-start"
    >
      <StepperItem
        v-for="(s, i) in steps"
        :key="s.step"
        :step="s.step"
        class="group flex flex-1 flex-col items-center gap-2 last:flex-none"
      >
        <div class="flex w-full items-center">
          <StepperTrigger
            class="flex flex-col items-center gap-2 rounded-md p-1 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-50"
          >
            <StepperIndicator
              v-slot="{ state, step }"
              class="grid size-9 place-items-center rounded-full border text-sm font-semibold transition-colors data-[state=inactive]:border-(--border) data-[state=inactive]:bg-(--bg) data-[state=inactive]:text-(--fg-muted) data-[state=active]:border-(--accent) data-[state=active]:bg-(--accent) data-[state=active]:text-(--accent-fg) data-[state=completed]:border-emerald-500 data-[state=completed]:bg-emerald-500 data-[state=completed]:text-white dark:data-[state=completed]:border-emerald-400 dark:data-[state=completed]:bg-emerald-400 dark:data-[state=completed]:text-emerald-950"
            >
              <svg
                v-if="state === 'completed'"
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <template v-else>
                {{ step }}
              </template>
            </StepperIndicator>
          </StepperTrigger>

          <StepperSeparator
            v-if="i < steps.length - 1"
            class="mx-1 h-0.5 flex-1 rounded-full bg-(--border) data-[state=completed]:bg-emerald-500 dark:data-[state=completed]:bg-emerald-400"
          />
        </div>

        <div class="flex flex-col items-center text-center">
          <StepperTitle class="text-sm font-medium text-(--fg)">
            {{ s.title }}
          </StepperTitle>
          <StepperDescription class="text-xs text-(--fg-subtle)">
            {{ s.description }}
          </StepperDescription>
        </div>
      </StepperItem>
    </StepperRoot>

    <div class="mt-6 rounded-lg border border-(--border) bg-(--bg-subtle) p-6 text-center">
      <p class="text-sm text-(--fg-muted)">
        Step {{ current }} of {{ steps.length }} —
        <span class="font-medium text-(--fg)">{{ steps[current - 1].title }}</span>
      </p>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <button
        type="button"
        class="rounded-md border border-(--border) bg-(--bg) px-4 py-2 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="current === 1"
        @click="prev"
      >
        Back
      </button>
      <button
        type="button"
        class="rounded-md bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="isLast"
        @click="next"
      >
        {{ isLast ? 'Done' : 'Continue' }}
      </button>
    </div>
  </div>
</template>
