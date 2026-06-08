<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredContrast } from './index';

const contrast = usePreferredContrast({ ssrContrast: 'no-preference' });

const levels = [
  { value: 'more', label: 'More', desc: 'Heavier borders, stronger separation', query: 'prefers-contrast: more' },
  { value: 'less', label: 'Less', desc: 'Softer, lower-contrast surfaces', query: 'prefers-contrast: less' },
  { value: 'custom', label: 'Custom', desc: 'A user-defined contrast scheme', query: 'prefers-contrast: custom' },
  { value: 'no-preference', label: 'No preference', desc: 'Default system contrast', query: 'prefers-contrast: no-preference' },
] as const;

const active = computed(() => levels.find(l => l.value === contrast.value));

// Demonstrate adapting UI intensity to the reported contrast level.
const cardClass = computed(() => {
  switch (contrast.value) {
    case 'more':
      return 'border-(--border-strong) bg-(--bg-inset)';
    case 'less':
      return 'border-(--border) bg-(--bg-subtle) opacity-90';
    default:
      return 'border-(--border) bg-(--bg-elevated)';
  }
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Preferred contrast
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ contrast }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="level in levels"
        :key="level.value"
        class="flex flex-col gap-1 rounded-lg border px-3 py-2.5 transition"
        :class="contrast === level.value
          ? 'border-(--accent) bg-(--accent-subtle)'
          : 'border-(--border) bg-(--bg-elevated)'"
      >
        <span
          class="text-sm font-medium"
          :class="contrast === level.value ? 'text-(--accent-text)' : 'text-(--fg)'"
        >
          {{ level.label }}
        </span>
        <span class="text-xs leading-snug text-(--fg-muted)">{{ level.desc }}</span>
      </div>
    </div>

    <div class="rounded-xl border p-4 transition-colors" :class="cardClass">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Adaptive surface
      </span>
      <p class="mt-1 text-sm text-(--fg)">
        This card adjusts its borders and fill to match the
        <span class="font-mono text-(--fg-muted)">{{ active?.query }}</span> level.
      </p>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Read-only: toggle your OS accessibility "increase / reduce contrast" setting to update.
    </p>
  </div>
</template>
