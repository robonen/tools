<script setup lang="ts">
import { ref } from 'vue';
import { useVibrate } from './index';

const presets: Record<string, number[]> = {
  Pulse: [200],
  Double: [100, 60, 100],
  SOS: [100, 60, 100, 60, 100, 200, 250, 60, 250, 60, 250, 200, 100, 60, 100, 60, 100],
  Heartbeat: [120, 100, 120, 500],
};

const { isSupported, pattern, vibrate, stop, intervalControls } = useVibrate({
  pattern: presets.Double,
  interval: 1500,
});

const activePreset = ref('Double');
const looping = intervalControls?.isActive;

function applyPreset(name: string): void {
  activePreset.value = name;
  pattern.value = presets[name];
  vibrate();
}

function toggleLoop(): void {
  if (intervalControls?.isActive.value)
    stop();
  else
    intervalControls?.resume();
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      The Vibration API is not supported in this browser. Try a mobile device.
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Current pattern (ms)
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="isSupported
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          {{ isSupported ? 'supported' : 'unsupported' }}
        </span>
      </div>
      <div class="mt-2 overflow-x-auto rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
        [{{ Array.isArray(pattern) ? pattern.join(', ') : pattern }}]
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Presets</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="(_, name) in presets"
          :key="name"
          type="button"
          :disabled="!isSupported"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :class="activePreset === name
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="applyPreset(name)"
        >
          {{ name }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!isSupported"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="vibrate()"
      >
        Vibrate now
      </button>
      <button
        type="button"
        :disabled="!isSupported"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="toggleLoop"
      >
        {{ looping ? 'Stop loop' : 'Loop every 1.5s' }}
      </button>
      <button
        type="button"
        :disabled="!isSupported"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="stop"
      >
        Stop
      </button>
    </div>
  </div>
</template>
