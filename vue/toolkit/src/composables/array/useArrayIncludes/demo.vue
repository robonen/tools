<script setup lang="ts">
import { ref } from 'vue';
import { useArrayIncludes } from './index';

interface User {
  id: number;
  name: string;
}

const team = ref<User[]>([
  { id: 11, name: 'Ada' },
  { id: 22, name: 'Linus' },
  { id: 33, name: 'Grace' },
  { id: 44, name: 'Dennis' },
]);

// Search by an object key — `id` is compared against the searched value.
const searchId = ref(33);
const isMember = useArrayIncludes(team, searchId, 'id');

// Plain primitive membership with a reactive `fromIndex` option.
const tags = ref(['vue', 'reactive', 'composable', 'reactive']);
const query = ref('reactive');
const fromIndex = ref(2);
const hasTag = useArrayIncludes(tags, query, { fromIndex: fromIndex.value });
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Member by key
      </p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="user in team"
          :key="user.id"
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="user.id === searchId
            ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          {{ user.name }}
          <span class="font-mono text-(--fg-subtle)">#{{ user.id }}</span>
        </span>
      </div>

      <div class="mt-3 flex items-center gap-2">
        <input
          v-model.number="searchId"
          type="number"
          class="w-24 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium"
          :class="isMember
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-(--bg-inset) text-(--fg-subtle)'"
        >
          {{ isMember ? 'includes id' : 'not found' }}
        </span>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Primitive search (fromIndex 2)
      </p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="(tag, i) in tags"
          :key="i"
          class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="i < 2
            ? 'border-(--border) bg-(--bg-inset) text-(--fg-subtle) opacity-50 line-through'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          {{ tag }}
        </span>
      </div>

      <input
        v-model="query"
        type="text"
        placeholder="search a tag…"
        class="mt-3 w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <p class="mt-2 text-sm text-(--fg-muted)">
        Searching from index 2 →
        <span
          class="font-mono font-semibold"
          :class="hasTag ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-subtle)'"
        >{{ hasTag }}</span>
      </p>
    </div>
  </div>
</template>
