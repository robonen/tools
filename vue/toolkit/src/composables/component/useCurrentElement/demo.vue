<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useCurrentElement } from './index';

// Resolves to this component's root DOM element, re-read on mount + every update.
const el = useCurrentElement<HTMLElement>();

const padding = ref(16);
const childCount = ref(3);
const info = ref<{ tag: string; children: number; height: number } | null>(null);

watchEffect(() => {
  const node = el.value;
  if (!node) {
    // SSR / pre-mount: el.value is undefined.
    info.value = null;
    return;
  }

  info.value = {
    tag: node.tagName.toLowerCase(),
    children: node.querySelectorAll('[data-chip]').length,
    height: Math.round(node.getBoundingClientRect().height),
  };
});

const chips = ['vue', 'reactivity', 'composables', 'ssr', 'typescript', 'dom'];
</script>

<template>
  <div
    class="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-(--border) bg-(--bg-elevated)"
    :style="{ padding: `${padding}px` }"
  >
    <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
      Live measurement of this component's root
    </div>

    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="chip in chips.slice(0, childCount)"
        :key="chip"
        data-chip
        class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
      >
        {{ chip }}
      </span>
    </div>

    <label class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Root padding</span>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ padding }}px</span>
      </div>
      <input
        v-model.number="padding"
        type="range"
        min="8"
        max="40"
        class="w-full accent-(--accent)"
      >
    </label>

    <div class="flex items-center gap-2">
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="childCount <= 1"
        @click="childCount--"
      >
        Remove chip
      </button>
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="childCount >= chips.length"
        @click="childCount++"
      >
        Add chip
      </button>
    </div>

    <div class="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex items-center justify-between">
        <span class="text-(--fg-subtle)">el.value</span>
        <span>{{ info ? `<${info.tag}>` : 'undefined' }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-(--fg-subtle)">chips in DOM</span>
        <span>{{ info?.children ?? '—' }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-(--fg-subtle)">root height</span>
        <span>{{ info ? `${info.height}px` : '—' }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      The computed re-reads <code class="font-mono">$el</code> on every update, so the readout tracks
      padding and chip changes automatically.
    </p>
  </div>
</template>
