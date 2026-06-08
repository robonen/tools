<script setup lang="ts">
import { computed } from 'vue';
import { useActiveElement } from './index';

const activeElement = useActiveElement();

const fields = [
  { id: 'name', label: 'Full name', placeholder: 'Ada Lovelace', type: 'text' },
  { id: 'email', label: 'Email', placeholder: 'ada@analytical.engine', type: 'email' },
  { id: 'city', label: 'City', placeholder: 'London', type: 'text' },
];

const activeId = computed(() => activeElement.value?.id || null);
const activeTag = computed(() => activeElement.value?.tagName.toLowerCase() ?? null);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="space-y-3">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Focus a field
      </p>
      <div
        v-for="field in fields"
        :key="field.id"
        class="space-y-1"
      >
        <label
          :for="field.id"
          class="text-sm font-medium text-(--fg-muted)"
        >{{ field.label }}</label>
        <input
          :id="field.id"
          :type="field.type"
          :placeholder="field.placeholder"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      >
        A focusable button
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex items-center justify-between gap-3">
        <span class="text-(--fg-subtle)">activeElement</span>
        <span
          v-if="activeTag"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--accent-text)"
        >
          &lt;{{ activeTag }}&gt;
        </span>
        <span
          v-else
          class="text-xs text-(--fg-subtle)"
        >none</span>
      </div>
      <div class="mt-2 flex items-center justify-between gap-3">
        <span class="text-(--fg-subtle)">id</span>
        <span class="truncate">{{ activeId ?? '—' }}</span>
      </div>
    </div>
  </div>
</template>
