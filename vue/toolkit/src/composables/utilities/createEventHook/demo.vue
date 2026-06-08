<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { createEventHook } from './index';

interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

// A typed event hook with a tuple payload: (level, message).
const logHook = createEventHook<[LogEntry['level'], string]>();

const entries = ref<LogEntry[]>([]);
const listenerActive = ref(false);
const draft = ref('Deployment finished');
const level = ref<LogEntry['level']>('info');
let nextId = 0;
let off: (() => void) | null = null;

const levels: LogEntry['level'][] = ['info', 'warn', 'error'];

const badgeClass: Record<LogEntry['level'], string> = {
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
};

function subscribe() {
  if (off)
    return;
  // `on` returns a callable off-handle; calling it removes the listener.
  off = logHook.on((lvl, message) => {
    entries.value = [{ id: nextId++, level: lvl, message }, ...entries.value].slice(0, 6);
  });
  listenerActive.value = true;
}

function unsubscribe() {
  off?.();
  off = null;
  listenerActive.value = false;
}

async function emit() {
  const message = draft.value.trim();
  if (!message)
    return;
  // trigger fans out to every listener and awaits async ones.
  await logHook.trigger(level.value, message);
}

function clearLog() {
  entries.value = [];
}

onScopeDispose(unsubscribe);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Event hook</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="listenerActive
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        {{ listenerActive ? '1 listener' : 'no listeners' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="lvl in levels"
          :key="lvl"
          type="button"
          class="rounded-lg border px-2 py-1.5 text-xs font-medium uppercase tracking-wide transition active:scale-[0.98] cursor-pointer"
          :class="level === lvl
            ? 'border-transparent bg-(--accent) text-(--accent-fg)'
            : 'border-(--border) bg-(--bg-inset) text-(--fg) hover:border-(--border-strong)'"
          @click="level = lvl"
        >
          {{ lvl }}
        </button>
      </div>

      <form class="flex items-center gap-2" @submit.prevent="emit">
        <input
          v-model="draft"
          type="text"
          placeholder="log message…"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
        <button
          type="submit"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        >
          Trigger
        </button>
      </form>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="listenerActive ? unsubscribe() : subscribe()"
      >
        {{ listenerActive ? 'Detach listener (off)' : 'Attach listener (on)' }}
      </button>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Received events</span>
      <button
        v-if="entries.length"
        type="button"
        class="text-xs font-medium text-(--fg-muted) underline-offset-2 hover:underline cursor-pointer"
        @click="clearLog"
      >
        Clear
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2 min-h-24">
      <p v-if="!entries.length" class="text-sm text-(--fg-subtle)">
        {{ listenerActive ? 'Trigger an event to see it here.' : 'Attach a listener, then trigger.' }}
      </p>
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          :class="badgeClass[entry.level]"
        >
          {{ entry.level }}
        </span>
        <span class="truncate text-(--fg)">{{ entry.message }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Detach the listener and trigger again — with no listeners the payload is dropped.
    </p>
  </div>
</template>
