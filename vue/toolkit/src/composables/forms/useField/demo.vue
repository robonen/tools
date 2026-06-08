<script setup lang="ts">
import { useField } from './index';

// Standalone mode: no useForm() ancestor, so the field owns its own value,
// errors, touched state, and validation.
const {
  value,
  errorMessage,
  meta,
  attrs,
  validate,
  reset,
} = useField<string>('email', {
  initialValue: 'ada@example',
  validateOn: 'value',
  validate: (input) => {
    if (!input)
      return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input))
      return 'Enter a valid email address';
    return true;
  },
});

const inputClass = 'w-full rounded-lg border bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:outline-none focus:ring-2 focus:ring-(--ring)';
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label
        class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)"
        :for="attrs.name"
      >
        Email address
      </label>
      <input
        :id="attrs.name"
        v-model="value"
        v-bind="attrs"
        type="email"
        placeholder="you@example.com"
        :class="[
          inputClass,
          meta.touched.value && errorMessage
            ? 'border-red-500/60 focus:border-red-500'
            : 'border-(--border) focus:border-(--accent)',
        ]"
      >
      <p
        v-if="meta.touched.value && errorMessage"
        class="text-xs text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else
        class="text-xs text-(--fg-subtle)"
      >
        Validates on every keystroke.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="meta.valid.value
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'"
      >
        {{ meta.valid.value ? 'valid' : 'invalid' }}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        dirty: {{ meta.dirty.value }}
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        touched: {{ meta.touched.value }}
      </span>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="validate()"
      >
        Validate
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="reset()"
      >
        Reset
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      value: "{{ value }}"
    </div>
  </div>
</template>
