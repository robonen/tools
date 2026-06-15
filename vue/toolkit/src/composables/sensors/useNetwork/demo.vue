<script setup lang="ts">
import { computed } from 'vue';
import { useNetwork } from './index';

const {
  isSupported,
  isOnline,
  offlineAt,
  onlineAt,
  downlink,
  downlinkMax,
  effectiveType,
  rtt,
  saveData,
  type,
} = useNetwork();

const lastTransition = computed(() => {
  const ts = isOnline.value ? onlineAt.value : offlineAt.value;
  if (!ts)
    return '—';
  return new Date(ts).toLocaleTimeString();
});

const speedTiers: Record<string, number> = { 'slow-2g': 1, '2g': 2, '3g': 3, '4g': 4 };
const speedLevel = computed(() => effectiveType.value ? speedTiers[effectiveType.value] ?? 0 : 0);

function fmt(value: number | undefined, unit: string): string {
  return value === undefined ? '—' : `${value}${unit}`;
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      class="flex items-center justify-between rounded-xl border p-4 transition-colors"
      :class="isOnline
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-red-500/30 bg-red-500/10'"
    >
      <div class="flex items-center gap-3">
        <span
          class="flex size-9 items-center justify-center rounded-full"
          :class="isOnline ? 'bg-emerald-500/20' : 'bg-red-500/20'"
        >
          <span
            class="size-2.5 rounded-full"
            :class="isOnline ? 'animate-pulse bg-emerald-500' : 'bg-red-500'"
          />
        </span>
        <div>
          <p class="text-sm font-semibold" :class="isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'">
            {{ isOnline ? 'Online' : 'Offline' }}
          </p>
          <p class="text-xs text-fg-muted">
            {{ isOnline ? 'since' : 'at' }} {{ lastTransition }}
          </p>
        </div>
      </div>
      <span class="demo-badge">
        {{ type }}
      </span>
    </div>

    <div v-if="isSupported" class="demo-card p-4">
      <div class="mb-3 flex items-center justify-between">
        <span class="demo-label">Effective type</span>
        <span class="font-mono text-sm font-semibold text-accent-text">{{ effectiveType ?? 'unknown' }}</span>
      </div>
      <div class="flex gap-1">
        <span
          v-for="tier in 4"
          :key="tier"
          class="h-1.5 flex-1 rounded-full transition-colors"
          :class="tier <= speedLevel ? 'bg-accent' : 'bg-bg-inset'"
        />
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <dt class="demo-label">Downlink</dt>
          <dd class="mt-1 font-mono text-sm font-semibold tabular-nums text-fg">{{ fmt(downlink, ' Mbps') }}</dd>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <dt class="demo-label">RTT</dt>
          <dd class="mt-1 font-mono text-sm font-semibold tabular-nums text-fg">{{ fmt(rtt, ' ms') }}</dd>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <dt class="demo-label">Max downlink</dt>
          <dd class="mt-1 font-mono text-sm font-semibold tabular-nums text-fg">{{ fmt(downlinkMax, ' Mbps') }}</dd>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3">
          <dt class="demo-label">Save data</dt>
          <dd class="mt-1 font-mono text-sm font-semibold text-fg">{{ saveData === undefined ? '—' : (saveData ? 'on' : 'off') }}</dd>
        </div>
      </dl>
    </div>

    <div v-else class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
      <p class="text-sm font-medium text-amber-700 dark:text-amber-400">
        Network Information API not supported
      </p>
      <p class="mt-1 text-xs text-fg-muted">
        Online status still works; connection details are unavailable in this browser.
      </p>
    </div>

    <p class="text-xs text-fg-subtle">
      Toggle your device's connection (or DevTools network conditions) to watch the state react live.
    </p>
  </div>
</template>
