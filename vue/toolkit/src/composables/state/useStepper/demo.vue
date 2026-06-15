<script setup lang="ts">
import { useStepper } from './index';

// A record-based wizard: keys are step names, values carry per-step metadata
const {
  index,
  current,
  stepNames,
  isFirst,
  isLast,
  goToNext,
  goToPrevious,
  goTo,
  isBefore,
  isCurrent,
} = useStepper({
  account: { title: 'Account', hint: 'Pick a username and email' },
  profile: { title: 'Profile', hint: 'Tell us about yourself' },
  billing: { title: 'Billing', hint: 'Add a payment method' },
  review: { title: 'Review', hint: 'Confirm and finish' },
});
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-5">
    <!-- Step indicator -->
    <ol class="flex items-center justify-between">
      <li
        v-for="(name, i) in stepNames"
        :key="name"
        class="flex flex-1 items-center"
      >
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition active:scale-[0.98] cursor-pointer"
          :class="[
            isCurrent(name)
              ? 'border-transparent bg-accent text-accent-fg'
              : isBefore(name)
                ? 'border-transparent bg-bg-elevated text-fg-muted'
                : 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          ]"
          :aria-current="isCurrent(name) ? 'step' : undefined"
          @click="goTo(name)"
        >
          <span v-if="!isBefore(name) && !isCurrent(name)">✓</span>
          <span v-else>{{ i + 1 }}</span>
        </button>

        <span
          v-if="i < stepNames.length - 1"
          class="mx-2 h-px flex-1 transition-colors"
          :class="isBefore(name) ? 'bg-border' : 'bg-accent'"
        />
      </li>
    </ol>

    <!-- Current step content -->
    <div class="demo-card p-4">
      <p class="demo-label">
        Step {{ index + 1 }} of {{ stepNames.length }}
      </p>
      <h3 class="mt-1 text-lg font-semibold text-fg">
        {{ current.title }}
      </h3>
      <p class="mt-1 text-sm text-fg-muted">
        {{ current.hint }}
      </p>
    </div>

    <!-- Navigation -->
    <div class="flex items-center justify-between gap-3">
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="isFirst"
        @click="goToPrevious"
      >
        ‹ Back
      </button>

      <button
        type="button"
        class="demo-btn-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="isLast"
        @click="goToNext"
      >
        {{ isLast ? 'Finished' : 'Continue ›' }}
      </button>
    </div>
  </div>
</template>
