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
  <div class="demo-stack max-w-sm">
    <!-- Boolean toggle -->
    <div class="demo-card p-4">
      <p class="demo-label">
        Boolean toggle
      </p>

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="text-sm text-fg-muted">Notifications</span>

        <button
          type="button"
          role="switch"
          :aria-checked="isOn"
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition focus:outline-none focus:ring-2 focus:ring-ring"
          :class="isOn ? 'bg-accent' : 'bg-bg-inset'"
          @click="toggle()"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-bg-elevated shadow transition"
            :class="isOn ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div class="mt-3 rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm tabular-nums">
        <span class="text-fg-subtle">value: </span>
        <span :class="isOn ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-muted'">
          {{ isOn }}
        </span>
      </div>
    </div>

    <!-- Custom truthy/falsy values -->
    <div class="demo-card p-4">
      <p class="demo-label">
        Custom values
      </p>

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="demo-badge">
          {{ theme === 'dark' ? '☽' : '☀' }} {{ theme }}
        </span>

        <button
          type="button"
          class="demo-btn"
          @click="toggleTheme()"
        >
          Toggle theme
        </button>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="theme === 'light'"
          @click="toggleTheme('light')"
        >
          Set light
        </button>
        <button
          type="button"
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="theme === 'dark'"
          @click="toggleTheme('dark')"
        >
          Set dark
        </button>
      </div>
    </div>
  </div>
</template>
