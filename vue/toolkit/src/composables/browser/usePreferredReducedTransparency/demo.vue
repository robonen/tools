<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredReducedTransparency } from './index';

const transparency = usePreferredReducedTransparency();

const isReduced = computed(() => transparency.value === 'reduce');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        prefers-reduced-transparency
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isReduced
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isReduced ? 'bg-amber-500' : 'bg-emerald-500'"
        />
        {{ transparency }}
      </span>
    </div>

    <!-- Live preview: a frosted glass panel that flattens when reduce is preferred -->
    <div class="relative overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset) p-4">
      <div
        class="pointer-events-none absolute -left-6 -top-8 size-28 rounded-full bg-(--accent) opacity-60 blur-xl"
      />
      <div
        class="pointer-events-none absolute -bottom-10 right-2 size-24 rounded-full bg-sky-500 opacity-50 blur-xl"
      />
      <div
        class="relative rounded-lg border border-(--border) p-4 transition"
        :class="isReduced
          ? 'bg-(--bg-elevated)'
          : 'bg-(--bg-elevated)/60 backdrop-blur-md'"
      >
        <p class="text-sm font-medium text-(--fg)">
          Glass card
        </p>
        <p class="mt-1 text-sm text-(--fg-muted)">
          {{ isReduced
            ? 'Translucency removed for clarity.'
            : 'Background blurs through the panel.' }}
        </p>
      </div>
    </div>

    <p class="text-xs leading-relaxed text-(--fg-subtle)">
      Toggle <span class="font-mono text-(--fg-muted)">Reduce transparency</span> in your OS
      accessibility settings to see this update live.
    </p>
  </div>
</template>
