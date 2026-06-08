<script setup lang="ts">
import { useToggle } from './index';

// Basic boolean toggle
const { value: isOn, toggle } = useToggle(false);

// Custom truthy/falsy values — drives a theme label
const { value: theme, toggle: toggleTheme } = useToggle('light', {
  truthyValue: 'dark',
  falsyValue: 'light',
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <!-- Boolean toggle -->
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Boolean toggle
      </p>

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="text-sm text-(--fg-muted)">Notifications</span>

        <button
          type="button"
          role="switch"
          :aria-checked="isOn"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-(--border) transition focus:outline-none focus:ring-2 focus:ring-(--ring)"
          :class="isOn ? 'bg-(--accent)' : 'bg-(--bg-inset)'"
          @click="toggle()"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-(--bg-elevated) shadow transition"
            :class="isOn ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div class="mt-3 rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums">
        <span class="text-(--fg-subtle)">value: </span>
        <span :class="isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'">
          {{ isOn }}
        </span>
      </div>
    </div>

    <!-- Custom truthy/falsy values -->
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Custom values
      </p>

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ theme === 'dark' ? '☽' : '☀' }} {{ theme }}
        </span>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggleTheme()"
        >
          Toggle theme
        </button>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="theme === 'light'"
          @click="toggleTheme('light')"
        >
          Set light
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="theme === 'dark'"
          @click="toggleTheme('dark')"
        >
          Set dark
        </button>
      </div>
    </div>
  </div>
</template>
