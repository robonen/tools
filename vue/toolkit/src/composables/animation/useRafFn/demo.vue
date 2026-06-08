<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { useRafFn } from './index';

const fpsLimit = ref(0);

const position = ref(0);
const direction = ref(1);
const delta = shallowRef(0);
const fps = shallowRef(0);
const frames = ref(0);

const { isActive, pause, resume, toggle } = useRafFn(
  ({ delta: d }) => {
    delta.value = d;
    fps.value = d > 0 ? Math.round(1000 / d) : 0;
    frames.value++;

    // Bounce a marker across the track using real frame delta (px per second).
    position.value += direction.value * (d / 1000) * 120;

    if (position.value >= 100) {
      position.value = 100;
      direction.value = -1;
    }
    else if (position.value <= 0) {
      position.value = 0;
      direction.value = 1;
    }
  },
  { fpsLimit: fpsLimit.value || undefined },
);

const limitLabel = computed(() => (fpsLimit.value === 0 ? 'Unlimited' : `${fpsLimit.value} fps`));
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">requestAnimationFrame</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          <span class="size-1.5 rounded-full transition" :class="isActive ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ isActive ? 'Running' : 'Paused' }}
        </span>
      </div>

      <!-- The animated track: marker position is updated every frame -->
      <div class="relative mx-2.5 h-8 rounded-lg border border-(--border) bg-(--bg-inset)">
        <div
          class="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--accent) shadow"
          :style="{ left: `${position}%` }"
        />
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ fps }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">fps</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ delta.toFixed(1) }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">delta ms</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-lg font-bold tabular-nums text-(--fg)">{{ frames }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">frames</div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="fps-limit">FPS limit</label>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ limitLabel }}</span>
      </div>
      <input
        id="fps-limit"
        v-model.number="fpsLimit"
        type="range"
        min="0"
        max="60"
        step="5"
        class="w-full accent-(--accent) cursor-pointer"
      >
      <p class="text-xs text-(--fg-subtle)">Changing the limit takes effect on the next mount; toggle below to see it live.</p>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
      @click="toggle"
    >
      {{ isActive ? 'Pause loop' : 'Resume loop' }}
    </button>
  </div>
</template>
