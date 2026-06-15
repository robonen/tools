<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTimestamp } from './index';

const interval = ref(1000);
const offset = ref(0);

const { timestamp, isActive, pause, resume } = useTimestamp({
  controls: true,
  interval: 1000,
  offset,
});

const clockTime = computed(() =>
  new Date(timestamp.value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }),
);

const clockDate = computed(() =>
  new Date(timestamp.value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }),
);

function toggle() {
  if (isActive.value)
    pause();
  else
    resume();
}

function shift(ms: number) {
  offset.value += ms;
}

function resetOffset() {
  offset.value = 0;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 text-center">
      <div class="demo-label">
        Reactive timestamp
      </div>
      <div class="demo-stat mt-2 text-3xl">
        {{ clockTime }}
      </div>
      <div class="mt-1 text-sm text-fg-muted">
        {{ clockDate }}
      </div>
      <div class="mt-3 flex items-center justify-center gap-2 text-xs text-fg-subtle">
        <span
          class="inline-block size-2 rounded-full transition"
          :class="isActive ? 'bg-emerald-500' : 'bg-border-strong'"
        />
        {{ isActive ? 'Updating every second' : 'Paused' }}
      </div>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums">
      {{ Math.round(timestamp) }} ms
    </div>

    <div class="flex items-center justify-between gap-2">
      <button
        class="demo-btn-primary"
        @click="toggle"
      >
        {{ isActive ? 'Pause' : 'Resume' }}
      </button>

      <div class="flex items-center gap-2">
        <button
          class="demo-btn"
          @click="shift(-3600_000)"
        >
          -1h
        </button>
        <button
          class="demo-btn"
          @click="shift(3600_000)"
        >
          +1h
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between text-sm text-fg-muted">
      <span>
        Offset:
        <span class="font-mono text-fg tabular-nums">{{ (offset / 3600_000).toFixed(0) }}h</span>
      </span>
      <button
        class="text-accent-text transition hover:underline disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        :disabled="offset === 0"
        @click="resetOffset"
      >
        Reset offset
      </button>
    </div>
  </div>
</template>
