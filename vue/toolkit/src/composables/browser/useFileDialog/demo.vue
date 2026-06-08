<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFileDialog } from './index';

const { files, open, reset, onChange, onCancel } = useFileDialog({
  accept: 'image/*',
  multiple: true,
});

const status = ref('Idle');
const multiple = ref(true);

const selected = computed(() => (files.value ? Array.from(files.value) : []));
const totalBytes = computed(() => selected.value.reduce((sum, file) => sum + file.size, 0));

function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

onChange((list) => {
  status.value = list && list.length ? `Selected ${list.length} file(s)` : 'Cleared';
});

onCancel(() => {
  status.value = 'Dialog dismissed';
});

function pick() {
  open({ multiple: multiple.value });
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-(--fg-muted)">
        <input v-model="multiple" type="checkbox" class="size-4 rounded border-(--border) accent-(--accent)">
        Allow multiple
      </label>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ status }}
      </span>
    </div>

    <div class="flex gap-2">
      <button class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer" @click="pick">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Choose images
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!selected.length"
        @click="reset"
      >
        Clear
      </button>
    </div>

    <div
      v-if="!selected.length"
      class="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center"
    >
      <span class="text-sm text-(--fg-muted)">No files selected</span>
      <span class="text-xs text-(--fg-subtle)">Click “Choose images” to open the native dialog</span>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">{{ selected.length }} file(s)</span>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ formatBytes(totalBytes) }} total</span>
      </div>
      <ul class="flex max-h-44 flex-col gap-1.5 overflow-auto">
        <li
          v-for="file in selected"
          :key="file.name + file.lastModified"
          class="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2"
        >
          <span class="truncate text-sm text-(--fg)">{{ file.name }}</span>
          <span class="shrink-0 font-mono text-xs tabular-nums text-(--fg-subtle)">{{ formatBytes(file.size) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
