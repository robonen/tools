<script setup lang="ts">
import { ref } from 'vue';
import { useWebNotification } from './index';

const title = ref('New message from Ada');
const body = ref('Hey — the deploy is green. Ship it whenever you are ready.');
const lastEvent = ref<string>('');

const {
  isSupported,
  notification,
  permissionGranted,
  show,
  close,
  ensurePermissionGranted,
  onClick,
  onShow,
  onClose,
  onError,
} = useWebNotification({
  // Don't prompt on mount — wait for an explicit user gesture below.
  requestPermissions: false,
  icon: 'https://vuejs.org/images/logo.png',
  requireInteraction: false,
});

onShow(() => (lastEvent.value = 'shown'));
onClick(() => (lastEvent.value = 'clicked'));
onClose(() => (lastEvent.value = 'closed'));
onError(() => (lastEvent.value = 'error'));

async function requestPermission() {
  await ensurePermissionGranted();
}

function notify() {
  show({ title: title.value, body: body.value });
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
    >
      Notifications are not supported in this browser.
    </div>

    <template v-else>
      <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
        <div>
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            Permission
          </div>
          <div class="mt-1 flex items-center gap-2 text-sm text-(--fg-muted)">
            <span
              class="inline-block size-2 rounded-full transition"
              :class="permissionGranted ? 'bg-emerald-500' : 'bg-(--border-strong)'"
            />
            {{ permissionGranted ? 'Granted' : 'Not granted' }}
          </div>
        </div>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="permissionGranted"
          @click="requestPermission"
        >
          {{ permissionGranted ? 'Allowed' : 'Request access' }}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Title</span>
          <input
            v-model="title"
            type="text"
            class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          >
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Body</span>
          <textarea
            v-model="body"
            rows="2"
            class="w-full resize-none rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          />
        </label>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!permissionGranted"
          @click="notify"
        >
          Show notification
        </button>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!notification"
          @click="close"
        >
          Close
        </button>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Last event</span>
        <span class="font-mono text-(--fg)">{{ lastEvent || '—' }}</span>
      </div>

      <p v-if="!permissionGranted" class="text-xs text-(--fg-subtle)">
        Grant access first, then trigger a notification. Switch back to this tab and it auto-closes.
      </p>
    </template>
  </div>
</template>
