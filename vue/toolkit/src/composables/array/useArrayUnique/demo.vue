<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrayUnique } from './index';

const raw = ref<string[]>([
  'design',
  'Design',
  'frontend',
  'design',
  'FRONTEND',
  'vue',
  'Vue',
  'a11y',
]);

const caseInsensitive = ref(true);

// Switch de-dup strategy reactively:
//  - identity (===): "Design" and "design" are distinct
//  - comparator: case-insensitive equality folds them together
const exact = useArrayUnique(raw);
const folded = useArrayUnique(raw, (a, b) => a.toLowerCase() === b.toLowerCase());

const unique = computed(() => (caseInsensitive.value ? folded.value : exact.value));

const draft = ref('');

function addTag() {
  const value = draft.value.trim();
  if (!value)
    return;
  raw.value = [...raw.value, value];
  draft.value = '';
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <form class="flex gap-2" @submit.prevent="addTag">
      <input
        v-model="draft"
        type="text"
        placeholder="Add a tag, e.g. TypeScript"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <button
        type="submit"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
      >
        Add
      </button>
    </form>

    <label class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2.5 text-sm text-(--fg)">
      <span>Case-insensitive comparator</span>
      <input
        v-model="caseInsensitive"
        type="checkbox"
        class="size-4 accent-(--accent) cursor-pointer"
      >
    </label>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Source ({{ raw.length }})
      </span>
      <div class="flex flex-wrap gap-1.5 rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span
          v-for="(tag, index) in raw"
          :key="`${tag}-${index}`"
          class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Unique ({{ unique.length }})
      </span>
      <div class="flex flex-wrap gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) p-3">
        <span
          v-for="tag in unique"
          :key="tag"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--accent) bg-(--accent-subtle) px-2 py-0.5 text-xs font-medium text-(--accent-text)"
        >
          {{ tag }}
        </span>
        <span v-if="unique.length === 0" class="text-xs text-(--fg-subtle)">No tags yet.</span>
      </div>
    </div>
  </div>
</template>
