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
  <div class="demo-stack max-w-sm">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="demo-label" for="wi-text">
          Draft
        </label>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="dirty
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-border bg-bg-inset text-fg-muted'"
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
        class="demo-input resize-none"
      />
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="demo-btn"
        @click="normalize"
      >
        Normalize (ignored)
      </button>
      <button
        type="button"
        :disabled="!dirty"
        class="demo-btn-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="save"
      >
        Save
      </button>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 flex flex-col gap-2">
      <div class="flex items-center justify-between text-sm">
        <span class="demo-label">Tracked edits</span>
        <span class="font-mono text-fg tabular-nums">{{ trackedEdits }}</span>
      </div>
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="demo-label">Last change</span>
        <span class="font-mono text-xs text-fg-muted truncate">{{ lastChange }}</span>
      </div>
    </div>

    <p class="text-xs text-fg-subtle">
      Typing counts as an edit; <span class="font-mono text-fg-muted">Normalize</span> writes the same
      ref inside <span class="font-mono text-fg-muted">ignoreUpdates()</span> and the watcher stays silent.
    </p>
  </div>
</template>
