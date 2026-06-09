<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from '@robonen/primitives';

const total = 96;
const pageSize = 10;
const page = ref(3);

const range = computed(() => {
  const start = (page.value - 1) * pageSize + 1;
  const end = Math.min(page.value * pageSize, total);
  return { start, end };
});
</script>

<template>
  <PaginationRoot
    v-slot="{ pageCount }"
    v-model:page="page"
    :total="total"
    :page-size="pageSize"
    :sibling-count="1"
    show-edges
    class="flex flex-col items-center gap-3 text-(--fg)"
  >
    <p class="text-sm text-(--fg-muted)">
      Showing <span class="font-medium text-(--fg)">{{ range.start }}–{{ range.end }}</span>
      of <span class="font-medium text-(--fg)">{{ total }}</span>
    </p>

    <PaginationList
      v-slot="{ items }"
      class="flex items-center gap-1"
    >
      <PaginationFirst
        class="grid size-9 place-items-center rounded-md border border-(--border) bg-(--bg) text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="First page"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      </PaginationFirst>

      <PaginationPrev
        class="grid size-9 place-items-center rounded-md border border-(--border) bg-(--bg) text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </PaginationPrev>

      <template
        v-for="(item, index) in items"
        :key="index"
      >
        <PaginationListItem
          v-if="item.type === 'page'"
          :value="item.value"
          class="grid size-9 place-items-center rounded-md border border-(--border) bg-(--bg) text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) data-[selected]:border-(--accent) data-[selected]:bg-(--accent) data-[selected]:text-(--accent-fg) data-[selected]:hover:bg-(--accent-hover)"
        >
          {{ item.value }}
        </PaginationListItem>
        <PaginationEllipsis
          v-else
          class="grid size-9 place-items-center text-sm text-(--fg-subtle)"
        />
      </template>

      <PaginationNext
        class="grid size-9 place-items-center rounded-md border border-(--border) bg-(--bg) text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </PaginationNext>

      <PaginationLast
        class="grid size-9 place-items-center rounded-md border border-(--border) bg-(--bg) text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Last page"
      >
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </PaginationLast>
    </PaginationList>

    <p class="text-xs text-(--fg-subtle)">
      Page {{ page }} of {{ pageCount }}
    </p>
  </PaginationRoot>
</template>
