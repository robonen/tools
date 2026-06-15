<script setup lang="ts">
import { computed } from 'vue';
import { useGeolocation } from './index';

// Don't auto-request location on mount — wait for a user gesture.
const {
  coords,
  locatedAt,
  error,
  ready,
  isActive,
  isSupported,
  resume,
  pause,
} = useGeolocation({ immediate: false, enableHighAccuracy: true });

const located = computed(() => locatedAt.value
  ? new Date(locatedAt.value).toLocaleTimeString()
  : '—');

function fmt(value: number | null, digits = 5): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300"
    >
      Geolocation is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <span class="demo-label">
          Geolocation
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
          :class="isActive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border border-border bg-bg-inset text-fg-muted'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="isActive ? 'bg-emerald-500 animate-pulse' : 'bg-fg-subtle'"
          />
          {{ isActive ? 'Watching' : 'Idle' }}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <div class="demo-label">Latitude</div>
          <div class="demo-stat mt-0.5 text-lg">
            {{ ready ? fmt(coords.latitude) : '—' }}
          </div>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <div class="demo-label">Longitude</div>
          <div class="demo-stat mt-0.5 text-lg">
            {{ ready ? fmt(coords.longitude) : '—' }}
          </div>
        </div>
      </div>

      <dl class="rounded-lg border border-border bg-bg-inset p-3 text-sm">
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-fg-muted">Accuracy</dt>
          <dd class="font-mono tabular-nums text-fg">
            {{ ready ? `± ${Math.round(coords.accuracy)} m` : '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-fg-muted">Heading</dt>
          <dd class="font-mono tabular-nums text-fg">
            {{ ready ? `${fmt(coords.heading, 0)}°` : '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-fg-muted">Located at</dt>
          <dd class="font-mono tabular-nums text-fg">{{ located }}</dd>
        </div>
      </dl>

      <p
        v-if="error"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ error.message || 'Unable to retrieve your location.' }}
      </p>

      <div class="flex gap-2">
        <button
          v-if="!isActive"
          type="button"
          class="demo-btn-primary flex-1"
          @click="resume"
        >
          {{ ready ? 'Resume watching' : 'Find my location' }}
        </button>
        <button
          v-else
          type="button"
          class="demo-btn flex-1"
          @click="pause"
        >
          Stop watching
        </button>
      </div>

      <p class="text-xs text-fg-subtle">
        Requires permission &mdash; nothing is requested until you press the button.
      </p>
    </template>
  </div>
</template>
