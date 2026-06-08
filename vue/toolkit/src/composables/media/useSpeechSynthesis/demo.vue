<script setup lang="ts">
import { ref } from 'vue';
import { useSpeechSynthesis } from './index';

const text = ref('The quick brown fox jumps over the lazy dog.');
const pitch = ref(1);
const rate = ref(1);
const volume = ref(1);

const {
  isSupported,
  isPlaying,
  status,
  speak,
  stop,
  toggle,
} = useSpeechSynthesis(text, { pitch, rate, volume });

const statusLabels: Record<string, string> = {
  init: 'Ready',
  play: 'Speaking',
  pause: 'Paused',
  end: 'Finished',
};
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Speech Synthesis is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Text to speak</label>
        <textarea
          v-model="text"
          rows="2"
          class="w-full resize-none rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        />
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Rate</span>
          <span class="font-mono text-sm tabular-nums text-(--fg)">{{ rate.toFixed(1) }}×</span>
        </div>
        <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" class="w-full accent-(--accent) cursor-pointer">

        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Pitch</span>
          <span class="font-mono text-sm tabular-nums text-(--fg)">{{ pitch.toFixed(1) }}</span>
        </div>
        <input v-model.number="pitch" type="range" min="0" max="2" step="0.1" class="w-full accent-(--accent) cursor-pointer">

        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Volume</span>
          <span class="font-mono text-sm tabular-nums text-(--fg)">{{ Math.round(volume * 100) }}%</span>
        </div>
        <input v-model.number="volume" type="range" min="0" max="1" step="0.05" class="w-full accent-(--accent) cursor-pointer">
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!text.trim()"
          @click="speak()"
        >
          Speak
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!isPlaying && status !== 'pause'"
          @click="toggle()"
        >
          {{ isPlaying ? 'Pause' : 'Resume' }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="stop()"
        >
          Stop
        </button>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Status</span>
        <span class="inline-flex items-center gap-1.5 font-mono text-sm text-(--fg)">
          <span
            class="size-2 rounded-full transition-colors"
            :class="isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'"
          />
          {{ statusLabels[status] }}
        </span>
      </div>
    </template>
  </div>
</template>
