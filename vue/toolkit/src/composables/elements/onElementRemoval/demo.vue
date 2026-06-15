<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { onElementRemoval } from './index';

const watched = useTemplateRef<HTMLDivElement>('watched');

const mounted = ref(true);
const removals = ref(0);
const lastEvent = ref<string | null>(null);

// Fires whenever the watched element (or any ancestor containing it) leaves the DOM.
onElementRemoval(watched, (records) => {
  removals.value++;
  lastEvent.value = new Date().toLocaleTimeString();
  // `records` are the raw MutationRecords describing the removal.
  void records;
});

function toggle() {
  mounted.value = !mounted.value;
}

function reset() {
  removals.value = 0;
  lastEvent.value = null;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">DOM removal watcher</span>
      <span
        class="demo-badge"
      >
        <span class="size-1.5 rounded-full transition" :class="mounted ? 'bg-emerald-500' : 'bg-fg-subtle'" />
        {{ mounted ? 'In DOM' : 'Removed' }}
      </span>
    </div>

    <div class="demo-card p-4 min-h-28 flex items-center justify-center">
      <div
        v-if="mounted"
        ref="watched"
        class="flex w-full flex-col items-center gap-1 rounded-lg border border-accent bg-accent-subtle px-4 py-6 text-center transition"
      >
        <span class="text-sm font-medium text-accent-text">Watched element</span>
        <span class="text-xs text-fg-muted">Remove me and the callback fires</span>
      </div>
      <span v-else class="text-sm text-fg-subtle">Element detached from the document</span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <div class="demo-stat text-3xl">{{ removals }}</div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">removals fired</div>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center flex flex-col justify-center">
        <div class="font-mono text-sm font-medium tabular-nums text-fg">{{ lastEvent ?? '—' }}</div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">last fired</div>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="demo-btn-primary flex-1"
        @click="toggle"
      >
        {{ mounted ? 'Remove element' : 'Mount element' }}
      </button>
      <button
        type="button"
        class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="removals === 0"
        @click="reset"
      >
        Reset
      </button>
    </div>
  </div>
</template>
