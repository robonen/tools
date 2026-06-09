<script setup lang="ts">
import { ref } from 'vue';
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@robonen/primitives';

const open = ref(false);

const commits = [
  { id: 'a1c3f9', msg: 'Reflect open state via data-state' },
  { id: 'b7e2d4', msg: 'Wire aria-controls to content id' },
  { id: 'c0f8a1', msg: 'Unmount content with Presence when closed' },
];
</script>

<template>
  <CollapsibleRoot
    v-model:open="open"
    class="w-full max-w-sm rounded-xl border border-(--border) bg-(--bg-elevated) p-3 text-(--fg)"
  >
    <div class="flex items-center justify-between gap-3 px-1">
      <span class="text-sm font-medium">
        <span class="font-mono text-(--fg-muted)">@robonen</span> pushed 3 commits
      </span>

      <CollapsibleTrigger
        class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        :aria-label="open ? 'Collapse commits' : 'Expand commits'"
      >
        <svg
          class="size-4 transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </CollapsibleTrigger>
    </div>

    <div class="mt-2 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 font-mono text-xs text-(--fg-muted)">
      <span class="text-emerald-600 dark:text-emerald-400">{{ commits[0].id }}</span>
      {{ commits[0].msg }}
    </div>

    <CollapsibleContent class="mt-1.5 space-y-1.5">
      <div
        v-for="commit in commits.slice(1)"
        :key="commit.id"
        class="rounded-lg border border-(--border) bg-(--bg) px-3 py-2 font-mono text-xs text-(--fg-muted)"
      >
        <span class="text-emerald-600 dark:text-emerald-400">{{ commit.id }}</span>
        {{ commit.msg }}
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
