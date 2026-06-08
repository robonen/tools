<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';
import { useWebWorker } from './index';

// Build a self-contained worker from a Blob so the demo needs no external file.
// The worker echoes back an uppercased, reversed version of the input string.
function createWorker(): Worker {
  const source = `
    onmessage = (e) => {
      const text = String(e.data ?? '');
      const transformed = text.toUpperCase().split('').reverse().join('');
      postMessage({ transformed, length: text.length, at: Date.now() });
    };
  `;
  const blob = new Blob([source], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

const input = ref('Hello from the main thread');
const log = shallowRef<string[]>([]);

const { data, post, isSupported } = useWebWorker<{ transformed: string; length: number; at: number }>(
  () => createWorker(),
);

watch(data, (value) => {
  if (value)
    log.value = [`${value.length} chars → ${value.transformed}`, ...log.value].slice(0, 4);
});

function send(): void {
  if (input.value.trim())
    post(input.value);
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Web Workers are not supported in this browser.
    </div>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Message to worker</label>
        <div class="flex items-center gap-2">
          <input
            v-model="input"
            type="text"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
            placeholder="Type something…"
            @keydown.enter="send"
          >
          <button
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            :disabled="!input.trim()"
            @click="send"
          >
            Post
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Latest reply</span>
        <p
          v-if="data"
          class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) break-all"
        >
          {{ data.transformed }}
        </p>
        <p v-else class="text-sm text-(--fg-subtle)">
          The worker runs off the main thread — post a message to see its reply.
        </p>
      </div>

      <div v-if="log.length" class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">History</span>
        <ul class="flex flex-col gap-1">
          <li
            v-for="(entry, i) in log"
            :key="i"
            class="rounded-md border border-(--border) bg-(--bg-inset) px-2.5 py-1.5 font-mono text-xs text-(--fg-muted) break-all"
          >
            {{ entry }}
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
