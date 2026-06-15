<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTimeAgo } from './index';

interface Preset {
  label: string;
  offset: number;
}

// Offsets in ms relative to now; negative = past, positive = future.
const presets: Preset[] = [
  { label: '15 s ago', offset: -15_000 },
  { label: '3 min ago', offset: -3 * 60_000 },
  { label: '2 h ago', offset: -2 * 3_600_000 },
  { label: 'Yesterday', offset: -86_400_000 },
  { label: 'Last week', offset: -7 * 86_400_000 },
  { label: '5 months ago', offset: -5 * 2_592_000_000 },
  { label: 'In 45 min', offset: 45 * 60_000 },
  { label: 'Next year', offset: 31_536_000_000 },
];

const offset = ref(presets[1]!.offset);

// Reactive getter recomputed each tick so the string stays live.
const target = computed(() => Date.now() + offset.value);

const { timeAgo, isActive, toggle } = useTimeAgo(target, {
  controls: true,
  updateInterval: 1000,
  showSecond: true,
});

const absolute = computed(() =>
  new Date(target.value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
);
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col items-center gap-2">
      <span class="demo-label">Relative time</span>
      <span class="demo-stat text-3xl text-center">{{ timeAgo }}</span>
      <span class="text-xs text-fg-muted">{{ absolute }}</span>
    </div>

    <div class="flex flex-col gap-2">
      <span class="demo-label">Pick an instant</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="offset === preset.offset
            ? 'border-transparent bg-accent text-accent-fg hover:bg-accent-hover'
            : 'border-border bg-bg-elevated text-fg hover:bg-bg-inset hover:border-border-strong'"
          @click="offset = preset.offset"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <span
        class="demo-badge"
      >
        <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-fg-subtle'" />
        {{ isActive ? 'Updating every 1s' : 'Updates paused' }}
      </span>
      <button
        type="button"
        class="demo-btn"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
    </div>
  </div>
</template>
