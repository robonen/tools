<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useDropZone } from './index';

const dropZone = useTemplateRef<HTMLElement>('dropZone');

const { isOverDropZone, files, isSupported } = useDropZone(dropZone, {
  dataTypes: ['image/'],
  onDrop: (dropped) => {
    // eslint-disable-next-line no-console
    console.log('dropped', dropped);
  },
});

const fileList = computed(() => files.value ?? []);

function formatSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300"
    >
      Drag and Drop is not supported in this browser.
    </div>

    <template v-else>
      <div
        ref="dropZone"
        class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition"
        :class="isOverDropZone
          ? 'border-(--accent) bg-(--accent-subtle)'
          : 'border-(--border-strong) bg-(--bg-elevated)'"
      >
        <span class="text-3xl transition" :class="isOverDropZone ? 'scale-110' : ''">
          {{ isOverDropZone ? '📥' : '🖼️' }}
        </span>
        <p class="text-sm font-medium text-(--fg)">
          {{ isOverDropZone ? 'Release to drop' : 'Drop image files here' }}
        </p>
        <p class="text-xs text-(--fg-subtle)">
          Only <span class="font-mono">image/*</span> files are accepted
        </p>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            Dropped files
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums">
            {{ fileList.length }}
          </span>
        </div>

        <p
          v-if="fileList.length === 0"
          class="mt-3 text-center text-sm text-(--fg-subtle)"
        >
          Nothing dropped yet.
        </p>

        <ul v-else class="mt-3 space-y-1.5">
          <li
            v-for="file in fileList"
            :key="file.name"
            class="flex items-center justify-between gap-3 rounded-md bg-(--bg-elevated) px-2.5 py-1.5"
          >
            <span class="truncate text-sm text-(--fg)">{{ file.name }}</span>
            <span class="shrink-0 font-mono text-xs tabular-nums text-(--fg-subtle)">
              {{ formatSize(file.size) }}
            </span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
