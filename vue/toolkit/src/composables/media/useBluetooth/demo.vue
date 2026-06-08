<script setup lang="ts">
import { computed } from 'vue';
import { useBluetooth } from './index';

const {
  isSupported,
  isConnected,
  device,
  requestDevice,
  connect,
  disconnect,
  error,
} = useBluetooth({
  // Surface every nearby device in the chooser so the demo works without
  // assuming any particular peripheral is in range.
  acceptAllDevices: true,
  optionalServices: ['battery_service'],
});

const deviceName = computed(() => device.value?.name || 'Unnamed device');
const deviceId = computed(() => device.value?.id ?? '');

const errorMessage = computed(() => {
  const err = error.value;
  if (!err)
    return '';
  if (err instanceof Error)
    return err.name === 'NotFoundError' ? 'No device selected (picker dismissed).' : err.message;
  return String(err);
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div v-if="!isSupported" class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
      Web Bluetooth is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Web Bluetooth</span>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
            <span class="size-1.5 rounded-full transition" :class="isConnected ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>

        <div v-if="device" class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-1">
          <div class="text-sm font-medium text-(--fg) truncate">{{ deviceName }}</div>
          <div class="font-mono text-xs text-(--fg-subtle) truncate">{{ deviceId }}</div>
        </div>
        <div v-else class="rounded-lg border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center text-sm text-(--fg-subtle)">
          No device paired yet
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
          @click="requestDevice"
        >
          Pair device
        </button>
        <button
          type="button"
          :disabled="!device || isConnected"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="connect"
        >
          Reconnect
        </button>
        <button
          type="button"
          :disabled="!isConnected"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>

      <p v-if="errorMessage" class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
        {{ errorMessage }}
      </p>
      <p class="text-xs text-(--fg-subtle)">
        Pairing prompts the browser's device chooser. A physical Bluetooth peripheral must be in range.
      </p>
    </template>
  </div>
</template>
