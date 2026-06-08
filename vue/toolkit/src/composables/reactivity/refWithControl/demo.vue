<script setup lang="ts">
import { ref } from 'vue';
import { refWithControl } from './index';

interface LogEntry {
  id: number;
  message: string;
  vetoed: boolean;
}

const log = ref<LogEntry[]>([]);
let logId = 0;

function push(message: string, vetoed = false) {
  log.value.unshift({ id: logId++, message, vetoed });
  if (log.value.length > 6)
    log.value.pop();
}

// Only values within 0..10 are accepted; anything else is vetoed.
const volume = refWithControl(5, {
  onBeforeChange: (value) => {
    if (value < 0 || value > 10) {
      push(`vetoed ${value} (out of 0..10)`, true);
      return false;
    }
  },
  onChanged: (value, old) => push(`changed ${old} -> ${value}`),
});

// Read without registering tracking — does not show up reactively.
const peeked = ref(volume.peek());
function peek() {
  peeked.value = volume.peek();
}

// Write without triggering effects: the bound display stays stale until
// a tracked read/write happens, demonstrating the silent set.
function silentBump() {
  volume.lay(Math.min(10, volume.peek() + 1));
  peeked.value = volume.peek();
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Volume (tracked)</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ volume }}</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="volume.value--"
        >
          - 1
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="volume.value++"
        >
          + 1
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="volume.value = 99"
        >
          Set 99
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
      <div class="flex flex-col">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">peek() snapshot</span>
        <span class="text-xs text-(--fg-subtle)">untracked read; lay() writes silently</span>
      </div>
      <span class="font-mono text-2xl font-bold tabular-nums text-(--fg)">{{ peeked }}</span>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="peek"
      >
        peek()
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="silentBump"
      >
        lay() +1 silent
      </button>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Hooks log</span>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 min-h-24 flex flex-col gap-1">
        <p v-if="!log.length" class="text-xs text-(--fg-subtle)">
          Try setting volume to 99 to see onBeforeChange veto.
        </p>
        <p
          v-for="entry in log"
          :key="entry.id"
          class="font-mono text-xs tabular-nums"
          :class="entry.vetoed ? 'text-red-600 dark:text-red-400' : 'text-(--fg-muted)'"
        >
          {{ entry.vetoed ? '✗' : '✓' }} {{ entry.message }}
        </p>
      </div>
    </div>
  </div>
</template>
