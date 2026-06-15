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
  <div class="demo-stack max-w-md">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Speech Synthesis is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <label class="demo-label">Text to speak</label>
        <textarea
          v-model="text"
          rows="2"
          class="demo-input resize-none"
        />
      </div>

      <div class="demo-card p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="demo-label">Rate</span>
          <span class="font-mono text-sm tabular-nums text-fg">{{ rate.toFixed(1) }}×</span>
        </div>
        <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" class="w-full accent-accent cursor-pointer">

        <div class="flex items-center justify-between">
          <span class="demo-label">Pitch</span>
          <span class="font-mono text-sm tabular-nums text-fg">{{ pitch.toFixed(1) }}</span>
        </div>
        <input v-model.number="pitch" type="range" min="0" max="2" step="0.1" class="w-full accent-accent cursor-pointer">

        <div class="flex items-center justify-between">
          <span class="demo-label">Volume</span>
          <span class="font-mono text-sm tabular-nums text-fg">{{ Math.round(volume * 100) }}%</span>
        </div>
        <input v-model.number="volume" type="range" min="0" max="1" step="0.05" class="w-full accent-accent cursor-pointer">
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!text.trim()"
          @click="speak()"
        >
          Speak
        </button>
        <button
          type="button"
          class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!isPlaying && status !== 'pause'"
          @click="toggle()"
        >
          {{ isPlaying ? 'Pause' : 'Resume' }}
        </button>
        <button
          type="button"
          class="demo-btn"
          @click="stop()"
        >
          Stop
        </button>
      </div>

      <div class="rounded-lg border border-border bg-bg-inset p-3 flex items-center justify-between">
        <span class="demo-label">Status</span>
        <span class="inline-flex items-center gap-1.5 font-mono text-sm text-fg">
          <span
            class="size-2 rounded-full transition-colors"
            :class="isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-fg-subtle'"
          />
          {{ statusLabels[status] }}
        </span>
      </div>
    </template>
  </div>
</template>
