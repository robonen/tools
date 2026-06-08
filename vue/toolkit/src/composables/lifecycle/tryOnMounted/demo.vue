<script setup lang="ts">
import { ref } from 'vue';
import { tryOnMounted } from './index';

interface LogEntry {
  id: number;
  label: string;
  at: number;
}

let seq = 0;
const start = Date.now();
const log = ref<LogEntry[]>([]);
const mounted = ref(false);

function push(label: string) {
  log.value.push({ id: ++seq, label, at: Date.now() - start });
}

// Marker dropped synchronously while setup runs — before the DOM exists.
push('setup body executed');

// Sync callback: registered through onMounted because we're inside a component.
tryOnMounted(() => {
  mounted.value = true;
  push('sync callback (onMounted)');
});

// Async callback: deferred to the next tick, runs after the sync one.
tryOnMounted(() => push('async callback (nextTick)'), { sync: false });
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">tryOnMounted</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="mounted
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="mounted ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        {{ mounted ? 'mounted' : 'pending' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Mount timeline</span>

      <ol class="mt-3 flex flex-col gap-2">
        <li
          v-for="(entry, index) in log"
          :key="entry.id"
          class="flex items-center gap-3"
        >
          <span
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-(--border) bg-(--bg-inset) font-mono text-xs font-medium text-(--fg-muted) tabular-nums"
          >
            {{ index + 1 }}
          </span>
          <span class="text-sm text-(--fg)">{{ entry.label }}</span>
          <span class="ml-auto font-mono text-xs text-(--fg-subtle) tabular-nums">+{{ entry.at }}ms</span>
        </li>
      </ol>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Both callbacks are safely deferred until the component is mounted. The async variant is queued one extra tick,
      so it consistently runs after the synchronous one.
    </p>
  </div>
</template>
