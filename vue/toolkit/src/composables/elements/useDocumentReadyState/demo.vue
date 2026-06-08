<script setup lang="ts">
import { computed } from 'vue';
import { useDocumentReadyState } from './index';

const readyState = useDocumentReadyState();

const stages: { state: DocumentReadyState; label: string; hint: string }[] = [
  { state: 'loading', label: 'loading', hint: 'Parsing the document' },
  { state: 'interactive', label: 'interactive', hint: 'DOM ready, assets pending' },
  { state: 'complete', label: 'complete', hint: 'Everything loaded' },
];

const activeIndex = computed(() => stages.findIndex(s => s.state === readyState.value));
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        document.readyState
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span class="size-1.5 rounded-full bg-emerald-500" />
        {{ readyState }}
      </span>
    </div>

    <ol class="space-y-2">
      <li
        v-for="(stage, i) in stages"
        :key="stage.state"
        class="flex items-center gap-3 rounded-lg border p-3 transition"
        :class="i <= activeIndex
          ? 'border-(--accent) bg-(--accent-subtle)'
          : 'border-(--border) bg-(--bg-elevated)'"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums transition"
          :class="i < activeIndex
            ? 'bg-(--accent) text-(--accent-fg)'
            : i === activeIndex
              ? 'bg-(--accent) text-(--accent-fg) ring-4 ring-(--ring)'
              : 'bg-(--bg-inset) text-(--fg-subtle)'"
        >
          {{ i + 1 }}
        </span>
        <div class="min-w-0">
          <p class="font-mono text-sm font-medium text-(--fg)">
            {{ stage.label }}
          </p>
          <p class="text-xs text-(--fg-subtle)">
            {{ stage.hint }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
