<script setup lang="ts">
import { ref } from 'vue';
import { logicNot } from './index';

const isLoading = ref(false);
const isReady = logicNot(isLoading);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-col">
        <span class="text-sm font-medium text-(--fg)">Loading</span>
        <span class="text-xs text-(--fg-subtle)">source value</span>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="isLoading"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-(--border) transition focus:outline-none focus:ring-2 focus:ring-(--ring)"
        :class="isLoading ? 'bg-(--accent)' : 'bg-(--bg-inset)'"
        @click="isLoading = !isLoading"
      >
        <span
          class="inline-block size-4 transform rounded-full bg-white shadow transition"
          :class="isLoading ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col items-center gap-1 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">isLoading</span>
        <span
          class="font-mono text-lg font-bold tabular-nums"
          :class="isLoading ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
        >{{ isLoading }}</span>
      </div>
      <div class="flex flex-col items-center gap-1 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">isReady = !isLoading</span>
        <span
          class="font-mono text-lg font-bold tabular-nums"
          :class="isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
        >{{ isReady }}</span>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center text-sm text-(--fg-muted)">
      <span v-if="isReady" class="text-emerald-600 dark:text-emerald-400">Ready to continue</span>
      <span v-else>Please wait, loading…</span>
    </div>
  </div>
</template>
