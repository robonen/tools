<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredColorScheme } from './index';

const scheme = usePreferredColorScheme();

const options = [
  { value: 'light', label: 'Light', icon: '☀️', hint: 'prefers-color-scheme: light' },
  { value: 'dark', label: 'Dark', icon: '🌙', hint: 'prefers-color-scheme: dark' },
  { value: 'no-preference', label: 'No preference', icon: '🌓', hint: 'no explicit preference' },
] as const;

const active = computed(() => options.find(o => o.value === scheme.value));

// A tiny live preview that flips its own palette based on the OS preference,
// independent of the docs site theme.
const previewClass = computed(() =>
  scheme.value === 'dark'
    ? 'bg-zinc-900 text-zinc-100 border-zinc-700'
    : 'bg-white text-zinc-900 border-zinc-200',
);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Preferred color scheme
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        <span class="size-1.5 rounded-full bg-emerald-500" />
        live
      </span>
    </div>

    <ul class="flex flex-col gap-2">
      <li
        v-for="option in options"
        :key="option.value"
        class="flex items-center gap-3 rounded-lg border px-3 py-2.5 transition"
        :class="scheme === option.value
          ? 'border-(--accent) bg-(--accent-subtle)'
          : 'border-(--border) bg-(--bg-elevated)'"
      >
        <span class="text-lg leading-none">{{ option.icon }}</span>
        <span class="flex flex-1 flex-col">
          <span
            class="text-sm font-medium"
            :class="scheme === option.value ? 'text-(--accent-text)' : 'text-(--fg)'"
          >
            {{ option.label }}
          </span>
          <span class="font-mono text-xs text-(--fg-subtle)">{{ option.hint }}</span>
        </span>
        <span
          v-if="scheme === option.value"
          class="text-(--accent-text)"
          aria-hidden="true"
        >✓</span>
      </li>
    </ul>

    <div
      class="flex items-center gap-3 rounded-xl border p-4 transition-colors"
      :class="previewClass"
    >
      <span class="text-2xl">{{ active?.icon }}</span>
      <div class="flex flex-col">
        <span class="text-sm font-semibold">Self-themed preview</span>
        <span class="text-xs opacity-70">
          Resolved to <span class="font-mono">{{ scheme }}</span>
        </span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Read-only: change your OS appearance setting to see this update instantly.
    </p>
  </div>
</template>
