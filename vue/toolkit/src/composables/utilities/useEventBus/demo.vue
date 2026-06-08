<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEventBus } from './index';
import type { EventBusKey } from './index';

interface ChatPayload {
  from: string;
  text: string;
}

// A typed key. In a real app this lives in a shared module so any component
// can `useEventBus(chatKey)` and land on the same listener set.
const chatKey: EventBusKey<'message'> = Symbol('demo:chat');

// Two distinct calls — they observe the SAME bus because the key matches.
const sender = useEventBus<'message', ChatPayload>(chatKey);
const receiver = useEventBus<'message', ChatPayload>(chatKey);

interface Entry extends ChatPayload {
  id: number;
  once?: boolean;
}

const log = ref<Entry[]>([]);
const draft = ref('Hello from the bus!');
let nextId = 0;

onMounted(() => {
  // Subscribe on the "receiver" side. tryOnScopeDispose unsubscribes for us.
  receiver.on((_event, payload) => {
    if (payload)
      log.value.unshift({ ...payload, id: nextId++ });
  });
});

function send(): void {
  const text = draft.value.trim();
  if (!text)
    return;

  sender.emit('message', { from: 'You', text });
  draft.value = '';
}

function pingOnce(): void {
  // once() fires for exactly one emit, then auto-unsubscribes.
  receiver.once((_event, payload) => {
    if (payload)
      log.value.unshift({ ...payload, id: nextId++, once: true });
  });
  sender.emit('message', { from: 'System', text: 'one-shot listener fired' });
}

function reset(): void {
  receiver.reset();
  log.value = [];
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center gap-2">
      <input
        v-model="draft"
        type="text"
        placeholder="Type a message…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        @keydown.enter="send"
      >
      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-2 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!draft.trim()"
        @click="send"
      >
        Emit
      </button>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">received via bus</span>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="pingOnce"
        >
          once()
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="log.length === 0"
          @click="reset"
        >
          reset()
        </button>
      </div>
    </div>

    <div class="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
      <p v-if="log.length === 0" class="py-6 text-center text-sm italic text-(--fg-subtle)">
        No events yet — emit one above.
      </p>
      <div
        v-for="entry in log"
        :key="entry.id"
        class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2"
      >
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium"
          :class="entry.from === 'You' ? 'text-(--accent-text)' : 'text-(--fg-muted)'"
        >
          {{ entry.from }}
        </span>
        <span class="min-w-0 flex-1 truncate text-sm text-(--fg)">{{ entry.text }}</span>
        <span
          v-if="entry.once"
          class="shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-600 dark:text-sky-400"
        >
          once
        </span>
      </div>
    </div>
  </div>
</template>
