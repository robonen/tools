<script setup lang="ts">
import { ref } from 'vue';
import { useCached } from './index';

// Source the user edits freely.
const source = ref('Hello');

// Default cache: updates on any strict-inequality change.
const cachedDefault = useCached(source);

// Custom cache: treats values equal when they match case-insensitively, so
// "hello" / "HELLO" never refresh the cache once one of them is stored.
const cachedInsensitive = useCached(
  source,
  (a, b) => a.toLowerCase() === b.toLowerCase(),
);

const samples = ['Hello', 'hello', 'HELLO', 'World', 'world!'];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Source ref</span>
      <input
        v-model="source"
        type="text"
        placeholder="Type to change the source"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="sample in samples"
        :key="sample"
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="source = sample"
      >
        {{ sample }}
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Default cache</span>
          <span class="text-xs text-(--fg-subtle)">a === b</span>
        </div>
        <span class="font-mono text-sm tabular-nums text-(--fg) truncate">"{{ cachedDefault }}"</span>
      </div>
      <div class="h-px bg-(--border)" />
      <div class="flex items-center justify-between gap-3">
        <div class="flex flex-col">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Case-insensitive cache</span>
          <span class="text-xs text-(--fg-subtle)">toLowerCase() match</span>
        </div>
        <span class="font-mono text-sm tabular-nums text-(--accent-text) truncate">"{{ cachedInsensitive }}"</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Toggle between <span class="font-mono">Hello</span>, <span class="font-mono">hello</span> and
      <span class="font-mono">HELLO</span>: the default cache follows every change, while the
      case-insensitive cache keeps its first stored casing.
    </p>
  </div>
</template>
