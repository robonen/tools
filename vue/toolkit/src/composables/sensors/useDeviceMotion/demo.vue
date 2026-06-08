<script setup lang="ts">
import { computed } from 'vue';
import { useDeviceMotion } from './index';

const {
  isSupported,
  requirePermissions,
  permissionGranted,
  acceleration,
  accelerationIncludingGravity,
  rotationRate,
  interval,
  ensurePermissions,
} = useDeviceMotion();

function fmt(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(2);
}

// Magnitude of acceleration including gravity — a quick "how much is it moving" gauge.
const magnitude = computed(() => {
  const a = accelerationIncludingGravity.value;
  if (!a) return 0;
  const { x = 0, y = 0, z = 0 } = a;
  return Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2);
});

const axes = computed(() => [
  { key: 'x', label: 'X', value: acceleration.value?.x },
  { key: 'y', label: 'Y', value: acceleration.value?.y },
  { key: 'z', label: 'Z', value: acceleration.value?.z },
]);

const rotation = computed(() => [
  { key: 'alpha', label: 'α', value: rotationRate.value?.alpha },
  { key: 'beta', label: 'β', value: rotationRate.value?.beta },
  { key: 'gamma', label: 'γ', value: rotationRate.value?.gamma },
]);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
      DeviceMotionEvent is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Device motion</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
          >
            <span class="size-1.5 rounded-full transition" :class="permissionGranted ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
            {{ permissionGranted ? 'Listening' : 'Idle' }}
          </span>
        </div>

        <!-- Live magnitude gauge from acceleration incl. gravity (m/s²) -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between">
            <span class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">|a| incl. gravity</span>
            <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ magnitude.toFixed(2) }} m/s²</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-(--bg-inset)">
            <div
              class="h-full rounded-full bg-(--accent) transition-all duration-150"
              :style="{ width: `${Math.min(magnitude / 20 * 100, 100)}%` }"
            />
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
        <span class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">Acceleration (m/s²)</span>
        <div class="grid grid-cols-3 gap-2">
          <div v-for="axis in axes" :key="axis.key" class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">{{ axis.label }}</div>
            <div class="font-mono text-base font-bold tabular-nums text-(--fg)">{{ fmt(axis.value) }}</div>
          </div>
        </div>

        <span class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">Rotation rate (deg/s)</span>
        <div class="grid grid-cols-3 gap-2">
          <div v-for="r in rotation" :key="r.key" class="rounded-lg border border-(--border) bg-(--bg-inset) p-2 text-center">
            <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">{{ r.label }}</div>
            <div class="font-mono text-base font-bold tabular-nums text-(--fg)">{{ fmt(r.value) }}</div>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-(--fg-subtle)">Sampling interval</span>
          <span class="font-mono tabular-nums text-(--fg-muted)">{{ interval ? `${interval} ms` : '—' }}</span>
        </div>
      </div>

      <!-- iOS 13+ gates motion behind an explicit, gesture-triggered grant -->
      <button
        v-if="requirePermissions && !permissionGranted"
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="ensurePermissions"
      >
        Enable motion access
      </button>
      <p v-else class="text-xs text-(--fg-subtle)">
        Move or tilt your device to see acceleration and rotation update in real time.
      </p>
    </template>
  </div>
</template>
