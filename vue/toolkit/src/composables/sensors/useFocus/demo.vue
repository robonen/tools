<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useFocus } from './index';

const input = useTemplateRef<HTMLInputElement>('input');
const { focused } = useFocus(input);

const email = ref('ada@example.com');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="space-y-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Newsletter email
      </label>
      <input
        ref="input"
        v-model="email"
        type="email"
        placeholder="you@example.com"
        class="w-full rounded-lg border bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:outline-none focus:ring-2 focus:ring-(--ring)"
        :class="focused ? 'border-(--accent)' : 'border-(--border)'"
      >
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
      <span class="text-sm text-(--fg-muted)">Focus state</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
        :class="focused
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="focused ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ focused ? 'Focused' : 'Blurred' }}
      </span>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="focused"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="focused = true"
      >
        Focus input
      </button>
      <button
        type="button"
        :disabled="!focused"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="focused = false"
      >
        Blur input
      </button>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      <code class="font-mono">focused</code> is writable &mdash; click the buttons or use Tab to drive it.
    </p>
  </div>
</template>
