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
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Relative time</span>
      <span class="font-mono text-3xl font-bold tabular-nums text-(--fg) text-center">{{ timeAgo }}</span>
      <span class="text-xs text-(--fg-muted)">{{ absolute }}</span>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Pick an instant</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="offset === preset.offset
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="offset = preset.offset"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
      >
        <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
        {{ isActive ? 'Updating every 1s' : 'Updates paused' }}
      </span>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>
    </div>
  </div>
</template>
