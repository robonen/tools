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
      h('div', { class: 'flex items-center justify-between rounded-lg border border-border bg-bg-inset px-3 py-2' }, [
        h('span', { class: 'text-sm font-medium text-fg' }, props.label),
        h('span', { class: 'font-mono text-sm tabular-nums text-accent-text' }, `count ${count.value} · #${setupId}`),
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
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">Shared composable</span>
      <span class="demo-badge">
        {{ subscribers.length }} active
      </span>
    </div>

    <div class="demo-card p-3">
      <div v-if="subscribers.length" class="flex flex-col gap-2">
        <Subscriber
          v-for="name in subscribers"
          :key="name"
          :label="name"
        />
      </div>
      <p v-else class="px-3 py-6 text-center text-sm text-fg-subtle">
        No consumers — the shared scope is disposed and its interval cleared.
      </p>
    </div>

    <p class="text-xs leading-relaxed text-fg-subtle">
      Every consumer reads the same count and the same setup id (<span class="font-mono">#</span>),
      proving a single instance and one interval back all of them. Remove every
      consumer to dispose the scope; adding one again creates a fresh instance.
    </p>

    <div class="flex gap-2">
      <button
        type="button"
        class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="subscribers.length >= names.length"
        @click="addSubscriber"
      >
        Add consumer
      </button>
      <button
        type="button"
        class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!subscribers.length"
        @click="removeSubscriber"
      >
        Remove consumer
      </button>
    </div>
  </div>
</template>
