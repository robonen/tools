<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from './index';

interface Repo {
  id: number;
  name: string;
  stars: number;
}

const ADJECTIVES = ['swift', 'lunar', 'crisp', 'nimbus', 'atlas', 'echo', 'quartz', 'vivid'];
const NOUNS = ['kit', 'forge', 'studio', 'engine', 'router', 'store', 'lab', 'core'];
const PAGE_SIZE = 12;
const MAX_ITEMS = 80;

const scrollEl = useTemplateRef<HTMLDivElement>('scrollEl');
const items = ref<Repo[]>([]);
let nextId = 0;

function makePage(): Repo[] {
  return Array.from({ length: PAGE_SIZE }, () => {
    const id = nextId++;
    const name = `${ADJECTIVES[id % ADJECTIVES.length]}-${NOUNS[(id * 3) % NOUNS.length]}`;
    return { id, name, stars: 200 + ((id * 137) % 9000) };
  });
}

const canLoadMore = () => items.value.length < MAX_ITEMS;

const { isLoading } = useInfiniteScroll(
  scrollEl,
  // Simulate a paged network fetch with latency.
  () => new Promise<void>((resolve) => {
    setTimeout(() => {
      items.value.push(...makePage().slice(0, MAX_ITEMS - items.value.length));
      resolve();
    }, 600);
  }),
  { distance: 24, canLoadMore },
);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Repositories</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums">
        {{ items.length }} / {{ MAX_ITEMS }} loaded
      </span>
    </div>

    <div
      ref="scrollEl"
      class="h-72 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-2"
    >
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="repo in items"
          :key="repo.id"
          class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg) px-3 py-2"
        >
          <span class="truncate font-mono text-sm text-(--fg)">{{ repo.name }}</span>
          <span class="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-(--fg-muted)">
            <span class="text-amber-500">★</span>{{ repo.stars.toLocaleString() }}
          </span>
        </li>
      </ul>

      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-2 py-4 text-sm text-(--fg-subtle)"
      >
        <span class="size-3.5 animate-spin rounded-full border-2 border-(--border-strong) border-t-transparent" />
        Loading more…
      </div>

      <div
        v-else-if="!canLoadMore()"
        class="py-4 text-center text-sm text-(--fg-subtle)"
      >
        You've reached the end.
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Scroll to within <span class="font-medium text-(--fg-muted)">24px</span> of the bottom to fetch the next page.
    </p>
  </div>
</template>
