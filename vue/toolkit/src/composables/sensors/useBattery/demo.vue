<script setup lang="ts">
import { computed } from 'vue';
import { useBattery } from './index';

const { isSupported, charging, level, chargingTime, dischargingTime } = useBattery();

const percent = computed(() => Math.round(level.value * 100));

const statusLabel = computed(() => {
  if (charging.value) return percent.value >= 100 ? 'Fully charged' : 'Charging';
  return percent.value <= 20 ? 'Low battery' : 'On battery';
});

// Color-code the fill the way an OS status bar would.
const fillClass = computed(() => {
  if (charging.value) return 'bg-emerald-500';
  if (percent.value <= 20) return 'bg-red-500';
  if (percent.value <= 50) return 'bg-amber-500';
  return 'bg-(--accent)';
});

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const chargingTimeLabel = computed(() => formatDuration(chargingTime.value));
const dischargingTimeLabel = computed(() => formatDuration(dischargingTime.value));
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
      Battery Status API is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Battery Status</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
          >
            <span class="size-1.5 rounded-full transition" :class="charging ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
            {{ statusLabel }}
          </span>
        </div>

        <!-- Battery silhouette: body + terminal cap, fill scales with level -->
        <div class="flex items-center gap-2">
          <div class="relative h-14 flex-1 rounded-lg border-2 border-(--border-strong) bg-(--bg-inset) p-1">
            <div
              class="h-full rounded-sm transition-all duration-500"
              :class="fillClass"
              :style="{ width: `${Math.max(percent, 2)}%` }"
            />
            <span class="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold tabular-nums text-(--fg)">
              {{ percent }}%
            </span>
          </div>
          <div class="h-6 w-1.5 rounded-r-sm bg-(--border-strong)" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">Time to full</div>
          <div class="font-mono text-base font-bold tabular-nums text-(--fg)">{{ chargingTimeLabel }}</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">Time to empty</div>
          <div class="font-mono text-base font-bold tabular-nums text-(--fg)">{{ dischargingTimeLabel }}</div>
        </div>
      </div>

      <p class="text-xs text-(--fg-subtle)">
        Plug in or unplug your charger to watch the charging state, level, and remaining time update live.
      </p>
    </template>
  </div>
</template>
