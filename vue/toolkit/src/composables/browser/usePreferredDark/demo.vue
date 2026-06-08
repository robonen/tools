<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredDark } from './index';

const isDark = usePreferredDark();

const label = computed(() => (isDark.value ? 'Dark' : 'Light'));
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        prefers-color-scheme: dark
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
        :class="isDark
          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        {{ isDark ? 'true' : 'false' }}
      </span>
    </div>

    <!-- A miniature sky scene that flips between day and night. -->
    <div
      class="relative flex h-40 items-end overflow-hidden rounded-xl border border-(--border) p-4 transition-colors duration-500"
      :class="isDark
        ? 'bg-gradient-to-b from-slate-900 to-slate-700'
        : 'bg-gradient-to-b from-sky-300 to-sky-100'"
    >
      <!-- Sun / Moon -->
      <div
        class="absolute right-5 top-5 size-12 rounded-full transition-all duration-500"
        :class="isDark
          ? 'bg-zinc-200 shadow-[0_0_28px_6px_rgba(228,228,231,0.4)]'
          : 'bg-amber-300 shadow-[0_0_36px_10px_rgba(252,211,77,0.6)]'"
      />
      <!-- Stars, only at night -->
      <Transition
        enter-active-class="transition-opacity duration-700"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-300"
        leave-to-class="opacity-0"
      >
        <div v-if="isDark" class="absolute inset-0">
          <span class="absolute left-6 top-7 size-1 rounded-full bg-white" />
          <span class="absolute left-20 top-12 size-0.5 rounded-full bg-white" />
          <span class="absolute left-32 top-6 size-1 rounded-full bg-white" />
          <span class="absolute left-12 top-16 size-0.5 rounded-full bg-white" />
          <span class="absolute left-40 top-16 size-1 rounded-full bg-white" />
        </div>
      </Transition>
      <span
        class="relative z-10 text-2xl font-bold tabular-nums transition-colors duration-500"
        :class="isDark ? 'text-zinc-100' : 'text-slate-800'"
      >
        {{ label }}
      </span>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      const isDark = usePreferredDark()
      <span class="text-(--fg-subtle)"> // </span>{{ isDark }}
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Read-only: switch your OS to dark/light mode to watch the scene change.
    </p>
  </div>
</template>
