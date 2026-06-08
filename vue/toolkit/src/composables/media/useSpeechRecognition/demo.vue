<script setup lang="ts">
import { ref } from 'vue';
import { useSpeechRecognition } from './index';

const lang = ref('en-US');

const languages = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ru-RU', label: 'Russian' },
];

const {
  isSupported,
  isListening,
  isFinal,
  result,
  confidence,
  error,
  toggle,
} = useSpeechRecognition({ lang, continuous: true, interimResults: true });
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400"
    >
      Speech Recognition is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Language</span>
        <select
          v-model="lang"
          :disabled="isListening"
          class="rounded-lg border border-(--border) bg-(--bg) px-2.5 py-1.5 text-sm text-(--fg) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring) disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option v-for="l in languages" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="isListening
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'"
        @click="toggle()"
      >
        <span
          class="size-2 rounded-full"
          :class="isListening ? 'bg-white animate-pulse' : 'bg-(--accent-fg)/60'"
        />
        {{ isListening ? 'Stop listening' : 'Start listening' }}
      </button>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2 min-h-28">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Transcript</span>
          <span
            v-if="result"
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
          >
            {{ isFinal ? 'final' : 'interim' }}
          </span>
        </div>
        <p
          v-if="result"
          class="text-sm leading-relaxed text-(--fg)"
          :class="{ 'italic text-(--fg-muted)': !isFinal }"
        >
          {{ result }}
        </p>
        <p v-else class="text-sm text-(--fg-subtle)">
          {{ isListening ? 'Listening… start speaking.' : 'Press start and say something.' }}
        </p>
      </div>

      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Confidence</span>
        <div class="flex items-center gap-2">
          <div class="h-1.5 w-24 overflow-hidden rounded-full bg-(--bg-elevated)">
            <div
              class="h-full rounded-full bg-(--accent) transition-all duration-300"
              :style="{ width: `${Math.round(confidence * 100)}%` }"
            />
          </div>
          <span class="font-mono text-sm tabular-nums text-(--fg)">{{ Math.round(confidence * 100) }}%</span>
        </div>
      </div>

      <p
        v-if="error"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ 'error' in error ? error.error : error.message }}
      </p>
    </template>
  </div>
</template>
