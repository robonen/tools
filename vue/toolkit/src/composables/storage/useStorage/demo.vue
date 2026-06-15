<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useStorage } from './index';
import type { StorageLike } from './index';

// useStorage is backend-agnostic: pass any object implementing StorageLike.
// Here we use a transparent in-memory backend so the demo is fully SSR-safe
// and we can show exactly what gets written to the store.
const raw = reactive<Record<string, string>>({});

const memoryStorage: StorageLike = {
  getItem: (key) => (key in raw ? raw[key] : null),
  setItem: (key, value) => { raw[key] = value; },
  removeItem: (key) => { delete raw[key]; },
};

// A Set value — useStorage guesses the Set serializer automatically.
const tags = useStorage('demo:tags', new Set(['vue', 'reactive']), memoryStorage);

// A custom serializer: store a number as a zero-padded string.
const ticket = useStorage('demo:ticket', 1, memoryStorage, {
  serializer: {
    read: (v) => Number.parseInt(v, 10),
    write: (v) => String(v).padStart(5, '0'),
  },
});

const newTag = reactive({ value: '' });

const tagList = computed(() => [...tags.value]);
const storeEntries = computed(() => Object.entries(raw));

function addTag() {
  const t = newTag.value.trim().toLowerCase();
  if (!t)
    return;
  // Reassign so the shallowRef watcher fires and writes to storage.
  tags.value = new Set([...tags.value, t]);
  newTag.value = '';
}

function removeTag(tag: string) {
  const next = new Set(tags.value);
  next.delete(tag);
  tags.value = next;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">Custom storage backend</span>
      <span class="demo-badge">
        in-memory
      </span>
    </div>

    <div class="demo-card p-4 flex flex-col gap-3">
      <span class="demo-label">Tags (Set)</span>

      <div class="flex flex-wrap gap-1.5 min-h-7">
        <span
          v-for="tag in tagList"
          :key="tag"
          class="demo-badge"
        >
          {{ tag }}
          <button
            type="button"
            class="text-fg-subtle transition hover:text-fg cursor-pointer"
            :aria-label="`Remove ${tag}`"
            @click="removeTag(tag)"
          >
            &times;
          </button>
        </span>
        <span v-if="tagList.length === 0" class="text-xs text-fg-subtle">No tags yet</span>
      </div>

      <form class="flex items-center gap-2" @submit.prevent="addTag">
        <input
          v-model="newTag.value"
          type="text"
          placeholder="add a tag…"
          class="demo-input"
        >
        <button
          type="submit"
          class="demo-btn-primary"
        >
          Add
        </button>
      </form>
    </div>

    <div class="demo-card p-4 flex items-center justify-between">
      <div class="flex flex-col gap-0.5">
        <span class="demo-label">Ticket #</span>
        <span class="text-xs text-fg-subtle">zero-padded serializer</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-inset text-fg transition hover:border-border-strong active:scale-[0.98] cursor-pointer"
          @click="ticket = Math.max(0, ticket - 1)"
        >
          &minus;
        </button>
        <span class="demo-stat text-2xl">{{ ticket }}</span>
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-inset text-fg transition hover:border-border-strong active:scale-[0.98] cursor-pointer"
          @click="ticket = ticket + 1"
        >
          +
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="demo-label">Raw store contents</span>
      <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-xs text-fg flex flex-col gap-1">
        <div v-for="[key, value] in storeEntries" :key="key" class="flex gap-2">
          <span class="text-fg-subtle shrink-0">{{ key }}</span>
          <span class="truncate">{{ value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
