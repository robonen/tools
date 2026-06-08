<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { useDisplayMedia } from './index';

const video = useTemplateRef<HTMLVideoElement>('video');

const { isSupported, stream, enabled, start, stop } = useDisplayMedia({ audio: false });

// Wire the live stream into the preview element whenever it changes.
watch([video, stream], ([el, media]) => {
  if (el)
    el.srcObject = media ?? null;
});

const track = computed(() => stream.value?.getVideoTracks()[0]);
const surfaceLabel = computed(() => track.value?.label || 'Shared surface');
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
      Screen capture (getDisplayMedia) is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Screen share</span>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
            <span class="size-1.5 rounded-full transition" :class="enabled ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
            {{ enabled ? 'Sharing' : 'Idle' }}
          </span>
        </div>

        <div class="relative aspect-video overflow-hidden rounded-lg border border-(--border) bg-(--bg-inset)">
          <video
            ref="video"
            autoplay
            muted
            playsinline
            class="size-full object-contain"
          />
          <div
            v-if="!stream"
            class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm text-(--fg-subtle)"
          >
            <span class="text-(--fg-muted)">No active capture</span>
            <span class="text-xs">Start sharing to preview your screen</span>
          </div>
        </div>

        <div v-if="stream" class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg) truncate">
          {{ surfaceLabel }}
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          v-if="!enabled"
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="start"
        >
          Start sharing
        </button>
        <button
          v-else
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="stop"
        >
          Stop sharing
        </button>

        <label class="inline-flex select-none items-center gap-2 text-sm text-(--fg-muted) cursor-pointer">
          <input v-model="enabled" type="checkbox" class="size-4 accent-(--accent) cursor-pointer">
          enabled
        </label>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Starting prompts the browser's screen-picker. Toggling <code class="font-mono">enabled</code> drives the same stream.
      </p>
    </template>
  </div>
</template>
