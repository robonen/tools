<script setup lang="ts">
import { ref } from 'vue';
import { tryOnBeforeMount } from './index';

interface LogEntry {
  id: number;
  label: string;
  phase: 'before-mount' | 'setup';
}

let seq = 0;
const log = ref<LogEntry[]>([]);
const order = ref<string[]>([]);

function push(label: string, phase: LogEntry['phase']) {
  log.value.push({ id: ++seq, label, phase });
  order.value.push(label);
}

// A marker we drop synchronously in setup so the relative ordering is visible.
push('setup body ran', 'setup');

// Synchronous hook: registers via onBeforeMount because we are inside a component.
tryOnBeforeMount(() => push('sync callback (onBeforeMount)', 'before-mount'));

// Async hook: deferred to the next tick.
tryOnBeforeMount(() => push('async callback (nextTick)', 'before-mount'), { sync: false });
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">tryOnBeforeMount</span>
      <p class="text-sm text-(--fg-muted)">
        Registers a callback on <code class="font-mono text-(--fg)">onBeforeMount</code> when inside a component,
        otherwise calls it directly. Watch the execution order below.
      </p>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Execution timeline</span>

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
          <span
            class="ml-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
            :class="entry.phase === 'before-mount'
              ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
              : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
          >
            {{ entry.phase }}
          </span>
        </li>
      </ol>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <span class="text-(--fg-subtle)">order:</span> [{{ order.join(' → ') }}]
    </div>

    <p class="text-xs text-(--fg-subtle)">
      The sync callback fires during the component's before-mount phase; the async one is queued to the next tick,
      so it always lands last.
    </p>
  </div>
</template>
