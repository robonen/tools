<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useObjectUrl } from './index';

const file = shallowRef<File>();
// useObjectUrl returns a single read-only ShallowRef<string | undefined>.
const url = useObjectUrl(file);

const isImage = computed(() => file.value?.type.startsWith('image/') ?? false);

const sizeLabel = computed(() => {
  const bytes = file.value?.size ?? 0;
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
});

const dragging = ref(false);

function onFiles(list: FileList | null | undefined) {
  if (list && list.length)
    file.value = list[0];
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  onFiles(event.dataTransfer?.files);
}

function clear() {
  file.value = undefined;
}

// A synthetic blob so the demo works even without a file at hand.
function generateSample() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160">`
    + `<rect width="240" height="160" fill="#6366f1"/>`
    + `<text x="120" y="90" font-size="22" font-family="sans-serif" fill="white" text-anchor="middle">useObjectUrl</text>`
    + `</svg>`;
  file.value = new File([svg], 'sample.svg', { type: 'image/svg+xml' });
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <label
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition"
      :class="dragging
        ? 'border-(--accent) bg-(--accent-subtle)'
        : 'border-(--border) bg-(--bg-inset) hover:border-(--border-strong)'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="text-2xl">📎</span>
      <span class="text-sm font-medium text-(--fg)">Drop a file or click to choose</span>
      <span class="text-xs text-(--fg-subtle)">An object URL is created instantly</span>
      <input
        type="file"
        class="hidden"
        @change="onFiles(($event.target as HTMLInputElement).files)"
      >
    </label>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="generateSample"
      >
        Use sample image
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!file"
        @click="clear"
      >
        Clear
      </button>
    </div>

    <div
      v-if="file"
      class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4"
    >
      <img
        v-if="isImage && url"
        :src="url"
        alt="Selected file preview"
        class="mx-auto max-h-40 rounded-lg border border-(--border) object-contain"
      >
      <div class="flex items-center justify-between gap-3 text-sm">
        <span class="truncate font-medium text-(--fg)">{{ file.name }}</span>
        <span class="shrink-0 font-mono text-xs text-(--fg-muted) tabular-nums">{{ sizeLabel }}</span>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg) break-all">
        {{ url }}
      </div>
    </div>

    <p
      v-else
      class="rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-6 text-center text-sm text-(--fg-subtle)"
    >
      No source — the URL ref is <code class="font-mono">undefined</code>
    </p>
  </div>
</template>
