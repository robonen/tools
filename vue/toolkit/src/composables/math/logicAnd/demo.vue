<script setup lang="ts">
import { computed, ref } from 'vue';
import { logicAnd } from './index';

// Realistic "ready to publish" checklist — each is a reactive boolean source.
const hasTitle = ref(true);
const acceptedTerms = ref(false);
const draftSaved = ref(true);

// A getter input, to show logicAnd accepts refs *and* getters.
const wordCount = ref(180);
const meetsLength = computed(() => wordCount.value >= 150);

const conditions = [
  { key: 'title', label: 'Title is filled in', model: hasTitle },
  { key: 'terms', label: 'Accepted publishing terms', model: acceptedTerms },
  { key: 'draft', label: 'Draft auto-saved', model: draftSaved },
];

// True only when every condition is truthy.
const canPublish = logicAnd(hasTitle, acceptedTerms, draftSaved, meetsLength);
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">logicAnd</span>
      <p class="text-sm text-(--fg-muted)">
        Reactive logical <code class="font-mono text-(--fg)">AND</code> — the result is true only when every input
        resolves truthy. Toggle the checklist below.
      </p>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <label
        v-for="cond in conditions"
        :key="cond.key"
        class="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1.5 transition hover:bg-(--bg-inset)"
      >
        <input
          v-model="cond.model.value"
          type="checkbox"
          class="h-4 w-4 shrink-0 cursor-pointer accent-(--accent)"
        >
        <span class="text-sm text-(--fg)">{{ cond.label }}</span>
        <span
          class="ml-auto inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums"
          :class="cond.model.value
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)'"
        >
          {{ cond.model.value }}
        </span>
      </label>

      <!-- A getter-driven input to prove logicAnd accepts getters too. -->
      <div class="mt-1 flex flex-col gap-2 rounded-lg bg-(--bg-inset) p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-(--fg)">Word count ≥ 150</span>
          <span
            class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums"
            :class="meetsLength
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-(--border) bg-(--bg-elevated) text-(--fg-subtle)'"
          >
            {{ meetsLength }}
          </span>
        </div>
        <input
          v-model.number="wordCount"
          type="range"
          min="0"
          max="300"
          step="10"
          class="w-full cursor-pointer accent-(--accent)"
        >
        <span class="font-mono text-xs text-(--fg-subtle) tabular-nums">{{ wordCount }} words</span>
      </div>
    </div>

    <div
      class="flex items-center justify-between rounded-lg border p-4 transition"
      :class="canPublish
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-(--border) bg-(--bg-inset)'"
    >
      <div class="flex flex-col gap-0.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">canPublish</span>
        <span
          class="font-mono text-3xl font-bold tabular-nums"
          :class="canPublish ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg)'"
        >
          {{ canPublish }}
        </span>
      </div>
      <button
        type="button"
        :disabled="!canPublish"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      >
        Publish
      </button>
    </div>
  </div>
</template>
