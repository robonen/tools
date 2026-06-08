<script setup lang="ts">
import { ref } from 'vue';
import { useArrayJoin } from './index';

const segments = ref<string[]>(['users', 'robonen', 'projects', 'tools']);
const separator = ref('/');
const draft = ref('');

// Reactive Array.prototype.join — recomputes on item edits and separator change.
const joined = useArrayJoin(segments, separator);

const separators: { label: string; value: string }[] = [
  { label: 'slash', value: '/' },
  { label: 'comma', value: ', ' },
  { label: 'dash', value: ' - ' },
  { label: 'none', value: '' },
];

function add() {
  const value = draft.value.trim();
  if (!value)
    return;
  segments.value.push(value);
  draft.value = '';
}

function remove(index: number) {
  segments.value.splice(index, 1);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="mb-1 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Joined result
      </p>
      <p class="break-all font-mono text-sm text-(--fg) tabular-nums">
        <span v-if="joined">{{ joined }}</span>
        <span v-else class="text-(--fg-subtle)">empty</span>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Separator</span>
      <div class="flex gap-1.5">
        <button
          v-for="sep in separators"
          :key="sep.label"
          type="button"
          class="flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition active:scale-[0.98] cursor-pointer"
          :class="separator === sep.value
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset)'"
          @click="separator = sep.value"
        >
          {{ sep.label }}
        </button>
      </div>
    </div>

    <ul class="flex flex-col gap-1.5">
      <li
        v-for="(segment, index) in segments"
        :key="index"
        class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm text-(--fg)"
      >
        <span class="flex items-center gap-2">
          <span class="font-mono text-xs text-(--fg-subtle)">{{ index }}</span>
          {{ segment }}
        </span>
        <button
          type="button"
          aria-label="Remove segment"
          class="rounded-md px-2 py-0.5 text-xs font-medium text-(--fg-subtle) transition hover:bg-(--bg-inset) hover:text-(--fg) cursor-pointer"
          @click="remove(index)"
        >
          ✕
        </button>
      </li>
    </ul>

    <form class="flex gap-2" @submit.prevent="add">
      <input
        v-model="draft"
        type="text"
        placeholder="add a segment…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <button
        type="submit"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!draft.trim()"
      >
        Add
      </button>
    </form>
  </div>
</template>
