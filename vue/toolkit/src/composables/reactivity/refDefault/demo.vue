<script setup lang="ts">
import { ref } from 'vue';
import { refDefault } from './index';

// Source may legitimately hold null (e.g. "not set yet").
const raw = ref<string | null>(null);

// Reactive fallback — `name` reads as `fallback` whenever `raw` is null/undefined.
const fallback = ref('Anonymous');
const name = refDefault(raw, fallback);
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card space-y-3 p-4">
      <p class="demo-label">
        Resolved value
      </p>
      <div class="flex items-center justify-between rounded-lg border border-border bg-bg-inset p-3">
        <span class="font-mono text-lg font-semibold text-fg">{{ name }}</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="raw == null
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border bg-bg-elevated text-fg-muted'"
        >
          {{ raw == null ? 'using default' : 'from source' }}
        </span>
      </div>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="demo-label">
        Source ref (writes pass through)
      </span>
      <div class="flex gap-2">
        <input
          v-model="name"
          placeholder="Type a name…"
          class="demo-input"
        >
        <button
          type="button"
          class="demo-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="raw == null"
          @click="raw = null"
        >
          Clear
        </button>
      </div>
      <span class="font-mono text-xs text-fg-subtle">
        raw.value = {{ raw === null ? 'null' : `"${raw}"` }}
      </span>
    </label>

    <label class="demo-card flex flex-col gap-1.5 p-4">
      <span class="demo-label">
        Reactive fallback
      </span>
      <input
        v-model="fallback"
        class="demo-input"
      >
      <span class="text-xs text-fg-subtle">
        Changes here update the resolved value while the source is empty.
      </span>
    </label>
  </div>
</template>
