<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useIdle } from './index';

// A short 3s threshold makes the idle transition easy to observe in the demo.
const timeout = ref(3000);

const { idle, lastActive, isPending, reset, start, stop } = useIdle(timeout.value);

// lastActive is a ms timestamp; tick a clock so the "seconds since" readout is live.
const now = ref(Date.now());
let clockId: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  clockId = setInterval(() => { now.value = Date.now(); }, 250);
});
onUnmounted(() => {
  if (clockId !== undefined)
    clearInterval(clockId);
});

const secondsSinceActive = computed(() =>
  Math.max(0, (now.value - lastActive.value) / 1000).toFixed(1),
);

const lastActiveLabel = computed(() =>
  new Date(lastActive.value).toLocaleTimeString(undefined, { hour12: false }),
);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Status</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="idle
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="idle ? 'bg-amber-500' : 'bg-emerald-500'"
          />
          {{ idle ? 'Idle' : 'Active' }}
        </span>
      </div>

      <p class="mt-3 text-sm text-(--fg-muted)">
        Move your mouse, type, or scroll to stay active. After
        <span class="font-medium text-(--fg)">{{ (timeout / 1000).toFixed(0) }}s</span>
        without activity you go idle.
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Inactive for</div>
        <div class="mt-1 font-mono text-2xl font-bold tabular-nums text-(--fg)">
          {{ secondsSinceActive }}<span class="text-base text-(--fg-subtle)">s</span>
        </div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last active</div>
        <div class="mt-1 font-mono text-2xl font-bold tabular-nums text-(--fg)">
          {{ lastActiveLabel }}
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="reset()"
      >
        Reset timer
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!isPending"
        @click="stop()"
      >
        Stop
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="isPending"
        @click="start()"
      >
        Start
      </button>

      <span class="ml-auto inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        tracking: {{ isPending ? 'on' : 'off' }}
      </span>
    </div>
  </div>
</template>
