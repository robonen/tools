<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOffsetPagination } from './index';

interface User {
  id: number;
  name: string;
  role: string;
}

const ROLES = ['Engineer', 'Designer', 'Manager', 'Analyst', 'Support'];
const FIRST = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis', 'Barbara', 'Ken'];
const LAST = ['Lovelace', 'Torvalds', 'Hopper', 'Turing', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson'];

// Realistic dataset of 47 users
const all = ref<User[]>(
  Array.from({ length: 47 }, (_, i) => ({
    id: i + 1,
    name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
    role: ROLES[i % ROLES.length],
  })),
);

const total = computed(() => all.value.length);

const {
  currentPage,
  currentPageSize,
  totalPages,
  isFirstPage,
  isLastPage,
  next,
  previous,
  select,
} = useOffsetPagination({ total, pageSize: 5, page: 1 });

const pageItems = computed(() => {
  const start = (currentPage.value - 1) * currentPageSize.value;
  return all.value.slice(start, start + currentPageSize.value);
});

const rangeStart = computed(() => (currentPage.value - 1) * currentPageSize.value + 1);
const rangeEnd = computed(() => Math.min(currentPage.value * currentPageSize.value, total.value));
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <!-- Page size control -->
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Per page
      </span>
      <div class="flex gap-1.5">
        <button
          v-for="size in [5, 10, 20]"
          :key="size"
          type="button"
          class="inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="currentPageSize === size
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="currentPageSize = size"
        >
          {{ size }}
        </button>
      </div>
    </div>

    <!-- Records -->
    <ul class="overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated)">
      <li
        v-for="user in pageItems"
        :key="user.id"
        class="flex items-center gap-3 border-b border-(--border) px-4 py-2.5 last:border-b-0"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--accent-subtle) text-xs font-semibold text-(--accent-text)">
          {{ user.id }}
        </span>
        <span class="flex-1 truncate text-sm font-medium text-(--fg)">{{ user.name }}</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ user.role }}
        </span>
      </li>
    </ul>

    <!-- Footer + pager -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-(--fg-muted) tabular-nums">
        {{ rangeStart }}–{{ rangeEnd }} of {{ total }}
      </p>

      <div class="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="isFirstPage"
          @click="previous"
        >
          ‹ Prev
        </button>

        <button
          v-for="page in totalPages"
          :key="page"
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition active:scale-[0.98] cursor-pointer"
          :class="page === currentPage
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="select(page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="isLastPage"
          @click="next"
        >
          Next ›
        </button>
      </div>
    </div>
  </div>
</template>
