<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useVirtualList } from './index';

interface Message {
  id: number;
  author: string;
  text: string;
  expanded: boolean;
}

const WORDS = 'virtual scrolling keeps the DOM small while the list pretends to be infinite and every row is free to size itself'.split(' ');

let nextId = 0;
function makeMessage(): Message {
  const id = nextId++;
  const length = 4 + (id * 31) % 60; // deterministic variable length
  const text = Array.from({ length }, (_, i) => WORDS[(id + i) % WORDS.length]).join(' ');
  return { id, author: `user-${id % 7}`, text, expanded: false };
}

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, makeMessage);
}

const messages = shallowRef<Message[]>(makeMessages(10000));

const CHARS_PER_LINE = 58; // calibrated against the docs demo card width

const { list, containerProps, wrapperProps, scrollTo, isScrolling } = useVirtualList(messages, {
  // Rows are genuinely variable (1–2 clamped lines collapsed, full text
  // expanded), so the estimate is data-driven. It only has to be close, not
  // exact — measured sizes replace it per row and are cached by key. What
  // hurts is *systematic* error: a big overestimate makes every revealed row
  // shrink on measure, and anchoring then fights the scroll.
  estimateSize: message => 37 + Math.min(2, Math.ceil(message.text.length / CHARS_PER_LINE)) * 20,
  getItemKey: message => message.id, // measurements survive prepend/reorder
  followOutput: true, // pinned to the newest message when the user is at the end
  overscan: 6,
  gap: 6,
  paddingStart: 8,
  paddingEnd: 8,
});

function prepend() {
  // Immutable update: getItemKey keeps measurements attached to the right
  // messages and scroll anchoring keeps the viewport visually still.
  messages.value = [...makeMessages(20), ...messages.value];
}

function append() {
  // With followOutput the view stays glued to the end if the user is there.
  messages.value = [...messages.value, ...makeMessages(5)];
}

function toggle(message: Message) {
  messages.value = messages.value.map(current =>
    current === message ? { ...current, expanded: !current.expanded } : current,
  );
  // No manual remeasure: the row's ResizeObserver sees the new height
  // before paint and the layout shifts without flicker.
}

const jumpTo = ref(5000);

function go() {
  scrollTo(jumpTo.value || 0, { align: 'center' });
}

const visibleRange = computed(() => {
  if (list.value.length === 0)
    return '—';
  return `${list.value[0]!.index}–${list.value[list.value.length - 1]!.index}`;
});
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">Dynamic virtual list</span>
      <span class="demo-badge">
        {{ messages.length.toLocaleString() }} rows
      </span>
    </div>

    <div
      v-bind="containerProps"
      class="demo-card h-64"
    >
      <div v-bind="wrapperProps">
        <article
          v-for="item in list"
          :key="item.key"
          v-bind="item.props"
          class="cursor-pointer border-b border-border px-3 py-2"
          @click="toggle(item.data)"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-mono text-xs text-fg-subtle">{{ item.data.author }}</span>
            <span class="text-xs text-fg-subtle tabular-nums">#{{ item.index }}</span>
          </div>
          <!-- natural height: collapsed rows clamp to two lines (still variable),
               expanded rows grow to the full text -->
          <p
            class="mt-1 text-sm text-fg"
            :class="item.data.expanded ? '' : 'line-clamp-2'"
          >
            {{ item.data.text }}
          </p>
        </article>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums flex items-center justify-between">
      <span class="text-fg-muted">rendered</span>
      <span>{{ list.length }} nodes · idx {{ visibleRange }}<span v-if="isScrolling"> · scrolling</span></span>
    </div>

    <div class="flex items-end gap-2">
      <label class="flex flex-1 flex-col gap-1">
        <span class="demo-label">Scroll to index</span>
        <input
          v-model.number="jumpTo"
          type="number"
          :min="0"
          :max="messages.length - 1"
          class="demo-input"
        >
      </label>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent-hover active:scale-[0.98] cursor-pointer"
        @click="go"
      >
        Jump
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-fg transition hover:bg-bg-inset active:scale-[0.98] cursor-pointer"
        @click="prepend"
      >
        Prepend
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-fg transition hover:bg-bg-inset active:scale-[0.98] cursor-pointer"
        @click="append"
      >
        Append
      </button>
    </div>
  </div>
</template>
