<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { onStartTyping } from './index';

// The canonical use case: start typing anywhere on the page (while no field is
// focused) and we auto-focus the search box — like GitHub / Slack quick search.
const searchInput = useTemplateRef<HTMLInputElement>('searchInput');
const query = ref('');
const focused = ref(false);
const lastChar = ref('');

const fruits = ['Apricot', 'Blueberry', 'Cherry', 'Dragonfruit', 'Elderberry', 'Fig', 'Guava'];
const results = ref(fruits);

onStartTyping((event) => {
  lastChar.value = event.key;
  // Guard: only steal focus if the input isn't already active.
  if (document.activeElement !== searchInput.value)
    searchInput.value?.focus();
});

function filter() {
  const q = query.value.trim().toLowerCase();
  results.value = q ? fruits.filter(f => f.toLowerCase().includes(q)) : fruits;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div
      class="rounded-xl border border-dashed p-5 text-center transition-colors"
      :class="focused
        ? 'border-(--accent) bg-(--accent-subtle)'
        : 'border-(--border-strong) bg-(--bg-inset)'"
    >
      <p class="text-sm text-(--fg)">
        Start typing
        <span class="font-medium">anywhere</span> on the page
      </p>
      <p class="mt-1 text-xs text-(--fg-subtle)">
        the search box below focuses itself automatically
      </p>
      <span
        v-if="lastChar"
        class="mt-3 inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
      >
        captured <span class="font-mono text-(--fg)">{{ lastChar === ' ' ? 'Space' : lastChar }}</span>
      </span>
    </div>

    <input
      ref="searchInput"
      v-model="query"
      type="text"
      placeholder="Search fruit…"
      class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      @input="filter"
      @focus="focused = true"
      @blur="focused = false"
    >

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 min-h-12">
      <ul v-if="results.length" class="flex flex-col">
        <li
          v-for="fruit in results"
          :key="fruit"
          class="rounded-md px-2 py-1.5 text-sm text-(--fg) transition-colors hover:bg-(--bg-elevated)"
        >
          {{ fruit }}
        </li>
      </ul>
      <p v-else class="px-2 py-3 text-center text-sm text-(--fg-subtle)">
        No fruit matches "{{ query }}"
      </p>
    </div>
  </div>
</template>
