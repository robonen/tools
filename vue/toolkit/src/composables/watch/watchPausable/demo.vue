<script setup lang="ts">
import { ref } from 'vue';
import { watchPausable } from './index';

const message = ref('Hello, world');
const syncs = ref<{ id: number; value: string; at: string }[]>([]);
let counter = 0;

const { isActive, pause, resume, stop } = watchPausable(message, (value) => {
  syncs.value.unshift({
    id: ++counter,
    value,
    at: new Date().toLocaleTimeString(undefined, { hour12: false }),
  });
  if (syncs.value.length > 6)
    syncs.value.length = 6;
});

const stopped = ref(false);

function handleStop() {
  stop();
  stopped.value = true;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Watched source
      </label>
      <input
        v-model="message"
        :disabled="stopped"
        type="text"
        placeholder="Type to trigger the watcher"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring) disabled:opacity-40"
      >
    </div>

    <div class="flex items-center gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="stopped
          ? 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)'
          : isActive
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="stopped ? 'bg-(--fg-subtle)' : isActive ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        {{ stopped ? 'Stopped' : isActive ? 'Watching' : 'Paused' }}
      </span>

      <div class="ml-auto flex gap-2">
        <button
          v-if="isActive"
          :disabled="stopped"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="pause"
        >
          Pause
        </button>
        <button
          v-else
          :disabled="stopped"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="resume"
        >
          Resume
        </button>
        <button
          :disabled="stopped"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="handleStop"
        >
          Stop
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Sync log
      </div>
      <ul v-if="syncs.length" class="flex flex-col gap-1.5">
        <li
          v-for="entry in syncs"
          :key="entry.id"
          class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2"
        >
          <span class="font-mono text-xs text-(--fg-subtle) tabular-nums">{{ entry.at }}</span>
          <span class="truncate font-mono text-sm text-(--fg)">{{ entry.value || '—' }}</span>
        </li>
      </ul>
      <p v-else class="py-2 text-sm text-(--fg-subtle)">
        Edit the field above to record a sync.
      </p>
    </div>

    <p class="text-xs text-(--fg-muted)">
      While paused, source changes are ignored — no entry is logged until you resume.
    </p>
  </div>
</template>
