<script setup lang="ts">
import { reactive } from 'vue';
import { reactivePick } from './index';

const settings = reactive({
  brightness: 60,
  contrast: 40,
  theme: 'midnight',
  autosave: true,
  syncedAt: '2026-06-08',
});

// Live two-way view limited to the picked keys — writes flow back to `settings`.
const display = reactivePick(settings, 'brightness', 'contrast');
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card space-y-4 p-4">
      <p class="demo-label">
        Picked view (two-way)
      </p>

      <label class="flex flex-col gap-1.5">
        <span class="flex items-center justify-between text-sm text-fg">
          <span>brightness</span>
          <span class="font-mono tabular-nums text-fg-muted">{{ display.brightness }}</span>
        </span>
        <input
          v-model.number="display.brightness"
          type="range"
          min="0"
          max="100"
          class="w-full accent-accent cursor-pointer"
        >
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="flex items-center justify-between text-sm text-fg">
          <span>contrast</span>
          <span class="font-mono tabular-nums text-fg-muted">{{ display.contrast }}</span>
        </span>
        <input
          v-model.number="display.contrast"
          type="range"
          min="0"
          max="100"
          class="w-full accent-accent cursor-pointer"
        >
      </label>
    </div>

    <div class="demo-card p-4">
      <p class="demo-label mb-2">
        Full source object
      </p>
      <pre class="overflow-x-auto rounded-lg border border-border bg-bg-inset p-3 font-mono text-xs text-fg">{{ settings }}</pre>
      <p class="mt-2 text-xs text-fg-subtle">
        Editing the picked view above writes straight back to the source.
      </p>
    </div>
  </div>
</template>
