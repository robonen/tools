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
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300"
    >
      Geolocation is not supported in this browser.
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Geolocation
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
          :class="isActive
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span
            class="size-1.5 rounded-full"
            :class="isActive ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'"
          />
          {{ isActive ? 'Watching' : 'Idle' }}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Latitude</div>
          <div class="mt-0.5 font-mono text-lg font-bold tabular-nums text-(--fg)">
            {{ ready ? fmt(coords.latitude) : '—' }}
          </div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Longitude</div>
          <div class="mt-0.5 font-mono text-lg font-bold tabular-nums text-(--fg)">
            {{ ready ? fmt(coords.longitude) : '—' }}
          </div>
        </div>
      </div>

      <dl class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm">
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-(--fg-muted)">Accuracy</dt>
          <dd class="font-mono tabular-nums text-(--fg)">
            {{ ready ? `± ${Math.round(coords.accuracy)} m` : '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-(--fg-muted)">Heading</dt>
          <dd class="font-mono tabular-nums text-(--fg)">
            {{ ready ? `${fmt(coords.heading, 0)}°` : '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between py-0.5">
          <dt class="text-(--fg-muted)">Located at</dt>
          <dd class="font-mono tabular-nums text-(--fg)">{{ located }}</dd>
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
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="resume"
        >
          {{ ready ? 'Resume watching' : 'Find my location' }}
        </button>
        <button
          v-else
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="pause"
        >
          Stop watching
        </button>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Requires permission &mdash; nothing is requested until you press the button.
      </p>
    </template>
  </div>
</template>
