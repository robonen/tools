<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useMediaControls } from './index';

const video = useTemplateRef<HTMLVideoElement>('video');

const {
  playing,
  currentTime,
  duration,
  volume,
  muted,
  rate,
  waiting,
  buffered,
  ended,
  supportsPictureInPicture,
  isPictureInPicture,
  togglePictureInPicture,
} = useMediaControls(video, {
  src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBigBuckBunny.mp4',
});

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds))
    return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Show buffered coverage as a percentage of the total duration.
const bufferedPercent = computed(() => {
  if (!duration.value)
    return 0;
  const end = buffered.value.length ? buffered.value[buffered.value.length - 1][1] : 0;
  return Math.min(100, (end / duration.value) * 100);
});

const progressPercent = computed(() =>
  duration.value ? (currentTime.value / duration.value) * 100 : 0);

const rates = [0.5, 1, 1.5, 2];
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="relative aspect-video overflow-hidden rounded-lg border border-(--border) bg-black">
        <video
          ref="video"
          playsinline
          class="size-full object-contain"
        />
        <div
          v-if="waiting"
          class="absolute inset-0 flex items-center justify-center bg-black/30 text-sm text-white"
        >
          Buffering…
        </div>
      </div>

      <!-- Scrub bar with a buffered underlay -->
      <div class="flex flex-col gap-1.5">
        <div class="relative h-1.5 overflow-hidden rounded-full bg-(--bg-inset)">
          <div class="absolute inset-y-0 left-0 bg-(--fg-subtle)/30" :style="{ width: `${bufferedPercent}%` }" />
          <div class="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-150" :style="{ width: `${progressPercent}%` }" />
        </div>
        <input
          v-model.number="currentTime"
          type="range"
          min="0"
          :max="duration || 0"
          step="0.1"
          class="w-full accent-(--accent) cursor-pointer"
          aria-label="Seek"
        >
        <div class="flex items-center justify-between font-mono text-xs tabular-nums text-(--fg-muted)">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="playing = !playing"
        >
          {{ playing ? 'Pause' : ended ? 'Replay' : 'Play' }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="muted = !muted"
        >
          {{ muted ? 'Unmute' : 'Mute' }}
        </button>
        <button
          v-if="supportsPictureInPicture"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="togglePictureInPicture"
        >
          {{ isPictureInPicture ? 'Exit PiP' : 'Picture-in-Picture' }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="vol">Volume</label>
          <input
            id="vol"
            v-model.number="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="w-full accent-(--accent) cursor-pointer"
          >
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Speed</span>
          <div class="flex gap-1">
            <button
              v-for="r in rates"
              :key="r"
              type="button"
              class="flex-1 rounded-md border px-2 py-1 text-xs font-medium tabular-nums transition cursor-pointer"
              :class="rate === r
                ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
                : 'border-(--border) bg-(--bg-elevated) text-(--fg-muted) hover:bg-(--bg-inset)'"
              @click="rate = r"
            >
              {{ r }}x
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Reactive controls over a real <code class="font-mono">&lt;video&gt;</code>: seek, volume, mute, playback rate, buffered ranges, and Picture-in-Picture.
    </p>
  </div>
</template>
