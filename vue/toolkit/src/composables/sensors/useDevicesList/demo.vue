<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDevicesList } from './index';

const {
  isSupported,
  videoInputs,
  audioInputs,
  audioOutputs,
  permissionGranted,
  ensurePermissions,
} = useDevicesList();

const requesting = ref(false);

async function grant(): Promise<void> {
  requesting.value = true;
  try {
    await ensurePermissions();
  }
  finally {
    requesting.value = false;
  }
}

interface Group {
  key: string;
  label: string;
  icon: string;
  devices: typeof videoInputs.value;
}

const groups = computed<Group[]>(() => [
  { key: 'video', label: 'Cameras', icon: 'M', devices: videoInputs.value },
  { key: 'audioin', label: 'Microphones', icon: 'A', devices: audioInputs.value },
  { key: 'audioout', label: 'Speakers', icon: 'S', devices: audioOutputs.value },
]);

const total = computed(() =>
  videoInputs.value.length + audioInputs.value.length + audioOutputs.value.length);

function deviceLabel(device: MediaDeviceInfo, index: number, kind: string): string {
  return device.label || `${kind} ${index + 1}`;
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      The MediaDevices API is not supported in this browser.
    </div>

    <template v-else>
      <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Media Devices</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium"
            :class="permissionGranted ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
          >
            <span
              class="size-1.5 rounded-full"
              :class="permissionGranted ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
            />
            {{ permissionGranted ? 'Labels unlocked' : `${total} found` }}
          </span>
        </div>

        <div class="flex flex-col gap-3">
          <div v-for="group in groups" :key="group.key" class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">{{ group.label }}</span>
              <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ group.devices.length }}</span>
            </div>

            <p v-if="group.devices.length === 0" class="px-1 py-1 text-xs text-(--fg-subtle)">
              None detected
            </p>

            <ul v-else class="flex flex-col gap-1">
              <li
                v-for="(device, index) in group.devices"
                :key="device.deviceId || index"
                class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm text-(--fg)"
              >
                <span class="grid size-6 flex-shrink-0 place-items-center rounded-md bg-(--accent-subtle) font-mono text-xs font-bold text-(--accent-text)">
                  {{ group.icon }}
                </span>
                <span class="truncate">{{ deviceLabel(device, index, group.label) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="permissionGranted || requesting"
        @click="grant"
      >
        {{ permissionGranted ? 'Permission granted' : requesting ? 'Requesting…' : 'Grant access to reveal names' }}
      </button>

      <p class="text-xs text-(--fg-subtle)">
        Without permission, device names are hidden. Plug in or remove a device to watch the list re-enumerate automatically.
      </p>
    </template>
  </div>
</template>
