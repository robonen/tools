<script setup lang="ts">
import { ref } from 'vue';
import { watchIgnorable } from './index';

// A "dirty tracking" editor: user typing marks the draft dirty, but a
// programmatic normalize pass writes the same ref inside `ignoreUpdates`,
// so it does NOT flip the dirty flag or count as a real edit.
const text = ref('The quick brown fox.');
const dirty = ref(false);
const trackedEdits = ref(0);
const lastChange = ref('—');

const { ignoreUpdates } = watchIgnorable(text, (value) => {
  dirty.value = true;
  trackedEdits.value++;
  lastChange.value = value;
});

function normalize() {
  // Collapse whitespace silently — the watcher stays quiet for this write.
  ignoreUpdates(() => {
    text.value = text.value.replace(/\s+/g, ' ').trim();
  });
}

function save() {
  dirty.value = false;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="wi-text">
          Draft
        </label>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="dirty
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="dirty ? 'bg-amber-500' : 'bg-emerald-500'"
          />
          {{ dirty ? 'Unsaved' : 'Saved' }}
        </span>
      </div>
      <textarea
        id="wi-text"
        v-model="text"
        rows="2"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition resize-none focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      />
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="normalize"
      >
        Normalize (ignored)
      </button>
      <button
        type="button"
        :disabled="!dirty"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="save"
      >
        Save
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between text-sm">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Tracked edits</span>
        <span class="font-mono text-(--fg) tabular-nums">{{ trackedEdits }}</span>
      </div>
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last change</span>
        <span class="font-mono text-xs text-(--fg-muted) truncate">{{ lastChange }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Typing counts as an edit; <span class="font-mono text-(--fg-muted)">Normalize</span> writes the same
      ref inside <span class="font-mono text-(--fg-muted)">ignoreUpdates()</span> and the watcher stays silent.
    </p>
  </div>
</template>
