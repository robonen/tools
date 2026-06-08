<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFileSystemAccess } from './index';

const lastError = ref('');

const {
  isSupported,
  data,
  fileName,
  fileMIME,
  fileSize,
  open,
  create,
  save,
  saveAs,
} = useFileSystemAccess({
  dataType: 'Text',
  types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md'] } }],
  onError: (error) => {
    lastError.value = error instanceof Error && error.name === 'AbortError'
      ? 'Cancelled'
      : 'Something went wrong';
  },
});

// Writable string proxy so the textarea can v-model the (union-typed) data ref.
const text = computed({
  get: () => (typeof data.value === 'string' ? data.value : ''),
  set: (value: string) => { data.value = value; },
});

function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B';
  const units = ['B', 'KB', 'MB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

async function newFile() {
  lastError.value = '';
  await create({ suggestedName: 'untitled.txt' });
  if (typeof data.value !== 'string')
    data.value = 'Hello from the File System Access API!\n';
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-600 dark:text-amber-400"
    >
      The File System Access API is not supported in this browser. Try Chrome or Edge.
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <button class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer" @click="open()">
          Open…
        </button>
        <button class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer" @click="newFile">
          New…
        </button>
        <button class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100" :disabled="data === undefined" @click="save()">
          Save
        </button>
        <button class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100" :disabled="data === undefined" @click="saveAs()">
          Save As…
        </button>
      </div>

      <div v-if="fileName" class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ fileName }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ fileMIME || 'text/plain' }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-mono tabular-nums text-(--fg-muted)">
          {{ formatBytes(fileSize) }}
        </span>
      </div>

      <textarea
        v-if="data !== undefined"
        v-model="text"
        rows="6"
        spellcheck="false"
        class="w-full resize-none rounded-lg border border-(--border) bg-(--bg) px-3 py-2 font-mono text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        placeholder="File contents…"
      />

      <div
        v-else
        class="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center"
      >
        <span class="text-sm text-(--fg-muted)">No file open</span>
        <span class="text-xs text-(--fg-subtle)">Open an existing file or create a new one, edit it, then save back to disk.</span>
      </div>

      <p v-if="lastError" class="text-center text-xs text-(--fg-subtle)">
        {{ lastError }}
      </p>
    </template>
  </div>
</template>
