<script setup lang="ts">
import { ref } from 'vue';
import { useClipboard } from './index';

const { text, copied, copyPending, isSupported, copy } = useClipboard({ copiedDuring: 1500 });

const draft = ref('npm install @robonen/toolkit');

const snippets = [
  'git switch -c feature/clipboard',
  'sk-live-9f2a4c7e1b8d6033',
  'https://robonen.dev/docs/useClipboard',
];
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Clipboard API</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'"
      >
        {{ isSupported ? 'Supported' : 'Not supported' }}
      </span>
    </div>

    <template v-if="isSupported">
      <div class="flex flex-col gap-2">
        <input
          v-model="draft"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          placeholder="Type something to copy…"
        >
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="copyPending || !draft"
          @click="copy(draft)"
        >
          {{ copyPending ? 'Copying…' : copied ? 'Copied!' : 'Copy to clipboard' }}
        </button>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Quick copy</span>
        <button
          v-for="snippet in snippets"
          :key="snippet"
          class="inline-flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2 text-left text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.99] cursor-pointer"
          @click="copy(snippet)"
        >
          <span class="truncate font-mono text-xs text-(--fg-muted)">{{ snippet }}</span>
          <span class="shrink-0 text-xs text-(--fg-subtle)">Copy</span>
        </button>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last copied</span>
        <p class="mt-1 break-all font-mono text-sm text-(--fg)">{{ text || '—' }}</p>
      </div>
    </template>

    <div
      v-else
      class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
    >
      The Clipboard API is not available in this browser.
    </div>
  </div>
</template>
