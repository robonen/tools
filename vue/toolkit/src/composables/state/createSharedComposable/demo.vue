<script setup lang="ts">
import { defineComponent, h, onScopeDispose, ref, shallowRef } from 'vue';
import { createSharedComposable } from './index';

// A tiny composable that holds a counter plus a per-instance setup id, so we can
// observe how many independent instances actually get created behind the scenes.
let instanceCounter = 0;

function useLiveCounter() {
  const setupId = ++instanceCounter;
  const count = shallowRef(0);

  // Demos render client-only, so the timer API is always available here.
  const id = setInterval(() => {
    count.value += 1;
  }, 1000);

  onScopeDispose(() => clearInterval(id));

  return { count, setupId };
}

// Shared variant: every consumer reuses the SAME instance + ticking interval.
const useSharedCounter = createSharedComposable(useLiveCounter);

// A subscriber widget that consumes the shared composable on mount and releases
// it on unmount (ref-counting drives scope creation / disposal).
const Subscriber = defineComponent({
  props: { label: { type: String, required: true } },
  setup(props) {
    const { count, setupId } = useSharedCounter();
    return () =>
      h('div', { class: 'flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2' }, [
        h('span', { class: 'text-sm font-medium text-(--fg)' }, props.label),
        h('span', { class: 'font-mono text-sm tabular-nums text-(--accent-text)' }, `count ${count.value} · #${setupId}`),
      ]);
  },
});

const subscribers = ref<string[]>(['Consumer A', 'Consumer B']);
const names = ['A', 'B', 'C', 'D', 'E'];

function addSubscriber() {
  const next = names[subscribers.value.length];
  if (next)
    subscribers.value.push(`Consumer ${next}`);
}

function removeSubscriber() {
  subscribers.value.pop();
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Shared composable</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ subscribers.length }} active
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
      <div v-if="subscribers.length" class="flex flex-col gap-2">
        <Subscriber
          v-for="name in subscribers"
          :key="name"
          :label="name"
        />
      </div>
      <p v-else class="px-3 py-6 text-center text-sm text-(--fg-subtle)">
        No consumers — the shared scope is disposed and its interval cleared.
      </p>
    </div>

    <p class="text-xs leading-relaxed text-(--fg-subtle)">
      Every consumer reads the same count and the same setup id (<span class="font-mono">#</span>),
      proving a single instance and one interval back all of them. Remove every
      consumer to dispose the scope; adding one again creates a fresh instance.
    </p>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="subscribers.length >= names.length"
        @click="addSubscriber"
      >
        Add consumer
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!subscribers.length"
        @click="removeSubscriber"
      >
        Remove consumer
      </button>
    </div>
  </div>
</template>
