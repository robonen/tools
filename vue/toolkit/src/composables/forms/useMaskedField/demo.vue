<script setup lang="ts">
import { useForm } from '../useForm';
import { useMaskedField } from './index';

interface Values {
  phone: string;
}

const form = useForm<Values>({ initialValues: { phone: '' }, validateOn: 'value' });

const { bind, display, complete, errorMessage } = useMaskedField('phone', {
  mask: '+1 (###) ###-####',
  validate: value => (typeof value === 'string' && value.length === 10) || 'Enter a complete phone number',
});

const onSubmit = form.handleSubmit((values) => {
  // eslint-disable-next-line no-alert
  globalThis.alert(`Submitted raw value: ${values.phone}`);
});

const inputClass = 'w-full rounded-lg border bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:outline-none focus:ring-2 focus:ring-(--ring)';
</script>

<template>
  <form class="flex w-full max-w-sm flex-col gap-4" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Phone number
      </label>
      <!-- One spread wires the ref, mask handlers, name, blur, and aria-invalid. -->
      <input
        v-bind="bind"
        type="text"
        inputmode="numeric"
        placeholder="+1 (###) ###-####"
        :class="[
          inputClass,
          errorMessage
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-(--border) focus:border-(--accent)',
        ]"
      >
      <p v-if="errorMessage" class="text-xs text-red-600 dark:text-red-400">
        {{ errorMessage }}
      </p>
      <p v-else class="text-xs text-(--fg-subtle)">
        Display is masked; the form stores the raw digits.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <span
        class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="complete
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)'"
      >
        {{ complete ? 'complete' : 'incomplete' }}
      </span>
    </div>

    <button
      type="submit"
      class="inline-flex items-center justify-center rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
    >
      Submit
    </button>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div>display: "{{ display }}"</div>
      <div>form value (raw): "{{ form.values.phone }}"</div>
    </div>
  </form>
</template>
