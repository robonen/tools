<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useLastChanged } from './index';

// A document title the user edits. `useLastChanged` records the timestamp of
// every change so we can render a live "edited N seconds ago" indicator.
const title = ref('Untitled document');

const lastChanged = useLastChanged(title);

// Tick once a second so the relative time stays fresh without re-triggering it.
const now = ref(Date.now());
const interval = setInterval(() => (now.value = Date.now()), 1000);
onUnmounted(() => clearInterval(interval));

const relative = computed(() => {
  if (lastChanged.value === null)
    return 'No changes yet';

  const seconds = Math.max(0, Math.round((now.value - lastChanged.value) / 1000));
  if (seconds < 1)
    return 'just now';
  if (seconds < 60)
    return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s ago`;
});

const exactTime = computed(() =>
  lastChanged.value === null
    ? '—'
    : new Date(lastChanged.value).toLocaleTimeString(undefined, { hour12: false }),
);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Document title</span>
      <input
        v-model="title"
        type="text"
        placeholder="Edit to update the timestamp"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last edited</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="lastChanged === null
            ? 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="lastChanged === null ? 'bg-(--fg-subtle)' : 'bg-emerald-500'" />
          {{ lastChanged === null ? 'untouched' : 'edited' }}
        </span>
      </div>

      <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ relative }}</span>

      <div class="h-px bg-(--border)" />

      <div class="flex items-center justify-between">
        <span class="text-xs text-(--fg-subtle)">Timestamp</span>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ exactTime }}</span>
      </div>
    </div>
  </div>
</template>
