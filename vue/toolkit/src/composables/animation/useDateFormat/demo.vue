<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDateFormat } from './index';

// A fixed, real-looking moment so the demo is deterministic across renders.
const date = ref('2026-06-08T14:37:09');
const format = ref('dddd, MMMM Do YYYY — hh:mm:ss a');
const locale = ref('en-US');

const formatted = useDateFormat(date, format, { locales: locale });

const formats = [
  'YYYY-MM-DD HH:mm:ss',
  'dddd, MMMM Do YYYY — hh:mm:ss a',
  'ddd D MMM \'YY',
  'h:mm A',
] as const;

const locales = [
  { value: 'en-US', label: 'English' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ja-JP', label: '日本語' },
] as const;

const isValid = computed(() => formatted.value !== 'Invalid Date');
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Formatted output
      </div>
      <div
        class="mt-2 font-mono text-lg font-semibold tabular-nums"
        :class="isValid ? 'text-(--fg)' : 'text-red-600 dark:text-red-400'"
      >
        {{ formatted }}
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Date input
      </label>
      <input
        v-model="date"
        type="datetime-local"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Format token string
      </label>
      <input
        v-model="format"
        type="text"
        spellcheck="false"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 font-mono text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <div class="flex flex-wrap gap-1.5 pt-1">
        <button
          v-for="f in formats"
          :key="f"
          class="rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 font-mono text-xs text-(--fg-muted) transition hover:bg-(--bg-elevated) hover:text-(--fg) active:scale-[0.98] cursor-pointer"
          :class="{ 'border-(--accent) text-(--accent-text)': format === f }"
          @click="format = f"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Locale
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="loc in locales"
          :key="loc.value"
          class="rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="locale === loc.value
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="locale = loc.value"
        >
          {{ loc.label }}
        </button>
      </div>
    </div>
  </div>
</template>
