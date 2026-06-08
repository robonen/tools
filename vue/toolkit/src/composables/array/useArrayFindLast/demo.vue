<script setup lang="ts">
import { ref } from 'vue';
import { useArrayFindLast } from './index';

interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

let nextId = 6;
const log = ref<LogEntry[]>([
  { id: 1, level: 'info', message: 'Server started on :3000' },
  { id: 2, level: 'warn', message: 'Cache miss for key "user:42"' },
  { id: 3, level: 'error', message: 'Failed to reach payments API' },
  { id: 4, level: 'info', message: 'Request handled in 12ms' },
  { id: 5, level: 'warn', message: 'Deprecated header received' },
]);

const filter = ref<LogEntry['level']>('warn');

// Reactive Array.prototype.findLast — the most recent entry at this level.
const latest = useArrayFindLast(log, entry => entry.level === filter.value);

const samples: LogEntry['message'][] = [
  'Disk usage at 82%',
  'New WebSocket connection',
  'Token refresh failed',
];

function append(level: LogEntry['level']) {
  const message = samples[Math.floor(Math.random() * samples.length)]!;
  log.value.push({ id: nextId++, level, message });
}

const levels: LogEntry['level'][] = ['info', 'warn', 'error'];
const tone: Record<LogEntry['level'], string> = {
  info: 'text-sky-600 dark:text-sky-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
};
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex gap-1.5">
      <button
        v-for="level in levels"
        :key="level"
        type="button"
        class="flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="filter === level
          ? 'border-transparent bg-(--accent) text-(--accent-fg)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset)'"
        @click="filter = level"
      >
        {{ level }}
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Latest “{{ filter }}” entry
      </p>
      <template v-if="latest">
        <p class="mt-1 font-mono text-sm text-(--fg)">{{ latest.message }}</p>
        <p class="mt-1 font-mono text-xs text-(--fg-subtle)">#{{ latest.id }}</p>
      </template>
      <p v-else class="mt-1 text-sm text-(--fg-subtle)">
        No “{{ filter }}” entries yet
      </p>
    </div>

    <ul class="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-lg border border-(--border) bg-(--bg-elevated) p-2">
      <li
        v-for="entry in log"
        :key="entry.id"
        class="flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs transition"
        :class="entry.id === latest?.id ? 'bg-(--accent-subtle)' : ''"
      >
        <span class="w-10 shrink-0 font-semibold uppercase" :class="tone[entry.level]">
          {{ entry.level }}
        </span>
        <span class="truncate text-(--fg-muted)">{{ entry.message }}</span>
      </li>
    </ul>

    <div class="flex gap-1.5">
      <button
        v-for="level in levels"
        :key="level"
        type="button"
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="append(level)"
      >
        + {{ level }}
      </button>
    </div>
  </div>
</template>
