<script setup lang="ts">
import { computed } from 'vue';
import { useUrlSearchParams } from './index';

interface Filters {
  q: string;
  sort: string;
  tags: string[];
}

// Reactive object mirrored to the URL query string. Mutate it to update the URL.
const params = useUrlSearchParams<Filters>('history', {
  initialValue: { q: 'vue', sort: 'recent', tags: ['ui'] },
  removeFalsyValues: true,
});

const sorts = ['recent', 'popular', 'name'];
const allTags = ['ui', 'browser', 'animation', 'sensors'];

const activeTags = computed<string[]>(() =>
  Array.isArray(params.tags) ? params.tags : params.tags ? [params.tags] : [],
);

function toggleTag(tag: string): void {
  const next = new Set(activeTags.value);
  if (next.has(tag))
    next.delete(tag);
  else
    next.add(tag);
  params.tags = [...next];
}

const queryString = computed(() => {
  const usp = new URLSearchParams();
  if (params.q)
    usp.set('q', params.q);
  if (params.sort)
    usp.set('sort', params.sort);
  for (const t of activeTags.value)
    usp.append('tags', t);
  const s = usp.toString();
  return s ? `?${s}` : '(empty)';
});
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Search query
      </label>
      <input
        v-model="params.q"
        type="text"
        placeholder="Search…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Sort by</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in sorts"
          :key="s"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="params.sort === s
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="params.sort = s"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Tags (repeated keys → array)
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in allTags"
          :key="tag"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition cursor-pointer"
          :class="activeTags.includes(tag)
            ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted) hover:border-(--border-strong)'"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Live URL query
      </span>
      <div class="overflow-x-auto rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
        <span class="whitespace-nowrap">{{ queryString }}</span>
      </div>
      <p class="text-xs text-(--fg-subtle)">
        The browser address bar updates as you edit. Falsy values are dropped.
      </p>
    </div>
  </div>
</template>
