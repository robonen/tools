<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@robonen/primitives';
import { ref } from 'vue';

const plans = [
  { value: 'starter', label: 'Starter', hint: 'For side projects', price: '$0' },
  { value: 'pro', label: 'Pro', hint: 'For growing teams', price: '$19' },
  { value: 'enterprise', label: 'Enterprise', hint: 'Custom limits & SSO', price: 'Contact us', disabled: true },
];

const plan = ref('pro');
</script>

<template>
  <div class="flex flex-col gap-4 p-6 max-w-sm bg-(--bg) text-(--fg) border border-(--border) rounded-xl">
    <div>
      <h3 class="text-sm font-semibold">
        Choose a plan
      </h3>
      <p class="text-xs text-(--fg-subtle)">
        Use the arrow keys to move between options.
      </p>
    </div>

    <RadioGroupRoot v-model="plan" class="flex flex-col gap-2">
      <label
        v-for="p in plans"
        :key="p.value"
        class="group flex items-center gap-3 p-3 rounded-lg border border-(--border) bg-(--bg-inset) cursor-pointer transition-colors has-[[data-state=checked]]:border-(--accent) has-[[data-state=checked]]:bg-(--bg-subtle) has-[[data-disabled]]:opacity-50 has-[[data-disabled]]:cursor-not-allowed"
      >
        <RadioGroupItem
          :value="p.value"
          :disabled="p.disabled"
          class="grid place-items-center shrink-0 w-4 h-4 rounded-full border border-(--border) bg-(--bg) outline-none transition-colors data-[state=checked]:border-(--accent) focus-visible:ring-2 focus-visible:ring-(--ring)"
        >
          <RadioGroupIndicator class="w-2 h-2 rounded-full bg-(--accent)" />
        </RadioGroupItem>

        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ p.label }}</span>
          <span class="text-xs text-(--fg-subtle)">{{ p.hint }}</span>
        </div>

        <span class="ml-auto text-sm font-semibold text-(--fg-muted)">{{ p.price }}</span>
      </label>
    </RadioGroupRoot>

    <p class="text-xs text-(--fg-muted)">
      Selected plan: <span class="font-semibold text-(--fg)">{{ plan }}</span>
    </p>
  </div>
</template>
