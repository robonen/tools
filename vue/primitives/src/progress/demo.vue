<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { ProgressIndicator, ProgressRoot } from '@robonen/primitives';

const value = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function start() {
  stop();
  value.value = 0;
  timer = setInterval(() => {
    value.value = Math.min(100, value.value + Math.round(8 + Math.random() * 14));
    if (value.value >= 100)
      stop();
  }, 600);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

onBeforeUnmount(stop);
</script>

<template>
  <div class="w-full max-w-sm space-y-6 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)">
    <!-- Determinate: a simulated upload -->
    <div class="space-y-2">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium">Uploading build.zip</span>
        <span class="font-mono text-(--fg-muted)">{{ value }}%</span>
      </div>

      <ProgressRoot
        v-slot="{ state }"
        :model-value="value"
        class="h-2 w-full overflow-hidden rounded-full bg-(--bg-inset)"
      >
        <ProgressIndicator
          class="h-full rounded-full transition-transform duration-500 ease-out"
          :class="state === 'complete'
            ? 'bg-emerald-500 dark:bg-emerald-400'
            : 'bg-(--accent)'"
          :style="{ transform: `translateX(-${100 - value}%)` }"
        />
      </ProgressRoot>

      <button
        type="button"
        class="rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm text-(--fg) transition hover:bg-(--bg-inset) active:scale-95 cursor-pointer"
        @click="start"
      >
        {{ value === 0 ? 'Start upload' : 'Restart' }}
      </button>
    </div>

    <!-- Indeterminate: value is null -->
    <div class="space-y-2">
      <span class="text-sm font-medium">Syncing changes…</span>

      <ProgressRoot
        :model-value="null"
        class="h-2 w-full overflow-hidden rounded-full bg-(--bg-inset)"
      >
        <ProgressIndicator class="h-full w-2/5 animate-pulse rounded-full bg-(--accent)" />
      </ProgressRoot>
    </div>
  </div>
</template>
