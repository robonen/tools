<script setup lang="ts">
import { computed } from 'vue';
import { useDeviceOrientation } from './index';

const { isSupported, isAbsolute, alpha, beta, gamma } = useDeviceOrientation();

function fmt(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(1)}°`;
}

// Drive a compass needle from alpha (rotation around the z axis).
const compassRotation = computed(() => (alpha.value == null ? 0 : -alpha.value));

// Tilt a card in 3D using beta (front-back) and gamma (left-right).
const tiltStyle = computed(() => ({
  transform: `perspective(600px) rotateX(${(beta.value ?? 0) * 0.4}deg) rotateY(${(gamma.value ?? 0) * 0.4}deg)`,
}));

const angles = computed(() => [
  { key: 'alpha', label: 'α · z-axis', value: alpha.value },
  { key: 'beta', label: 'β · x-axis', value: beta.value },
  { key: 'gamma', label: 'γ · y-axis', value: gamma.value },
]);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
      DeviceOrientationEvent is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-4">
        <div class="flex w-full items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Device orientation</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
          >
            <span class="size-1.5 rounded-full transition" :class="isAbsolute ? 'bg-emerald-500' : 'bg-sky-500'" />
            {{ isAbsolute ? 'Absolute' : 'Relative' }}
          </span>
        </div>

        <!-- Compass face + needle driven by alpha; card tilts via beta/gamma -->
        <div
          class="relative flex size-40 items-center justify-center rounded-full border-2 border-(--border-strong) bg-(--bg-inset)"
          :style="tiltStyle"
        >
          <span class="absolute top-1 text-[10px] font-bold text-(--fg-muted)">N</span>
          <span class="absolute bottom-1 text-[10px] text-(--fg-subtle)">S</span>
          <span class="absolute left-1.5 text-[10px] text-(--fg-subtle)">W</span>
          <span class="absolute right-1.5 text-[10px] text-(--fg-subtle)">E</span>
          <div
            class="h-16 w-1 origin-bottom rounded-full bg-(--accent) transition-transform duration-150"
            :style="{ transform: `rotate(${compassRotation}deg)` }"
          />
          <div class="absolute size-2 rounded-full bg-(--border-strong)" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div v-for="angle in angles" :key="angle.key" class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
          <div class="font-mono text-base font-bold tabular-nums text-(--fg)">{{ fmt(angle.value) }}</div>
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">{{ angle.label }}</div>
        </div>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Tilt and rotate your device to move the compass needle and tilt the dial. Best viewed on a phone.
      </p>
    </template>
  </div>
</template>
