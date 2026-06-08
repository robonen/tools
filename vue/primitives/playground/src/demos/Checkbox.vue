<script setup lang="ts">
import { ref } from 'vue';
import type { CheckedState } from '@primitives/checkbox';
import { CheckboxIndicator, CheckboxRoot } from '@primitives/checkbox';

const checked = ref<CheckedState>(false);
const disabled = ref(false);
</script>

<template>
  <section class="grid max-w-md gap-4">
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
      <label class="inline-flex items-center gap-1.5">
        <input v-model="disabled" type="checkbox"> disabled
      </label>
      <button
        type="button"
        class="rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs hover:border-blue-600 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-blue-400"
        @click="checked = 'indeterminate'"
      >
        set indeterminate
      </button>
      <output class="ml-auto font-mono text-xs text-neutral-500 dark:text-neutral-400">checked = {{ JSON.stringify(checked) }}</output>
    </div>

    <label class="inline-flex cursor-pointer items-center gap-2.5">
      <CheckboxRoot
        v-model:checked="checked"
        :disabled="disabled"
        class="inline-grid h-5 w-5 place-items-center rounded border border-neutral-200 bg-white data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white data-[state=indeterminate]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-neutral-800 dark:bg-neutral-900 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500 dark:data-[state=indeterminate]:border-blue-500 dark:data-[state=indeterminate]:bg-blue-500 dark:focus-visible:outline-blue-400"
      >
        <CheckboxIndicator class="text-[0.8125rem] leading-none">
          <span v-if="checked === 'indeterminate'">–</span>
          <span v-else-if="checked">✓</span>
        </CheckboxIndicator>
      </CheckboxRoot>
      Accept terms and conditions
    </label>
  </section>
</template>
