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
  <div class="demo-stack max-w-sm">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
    >
      Notifications are not supported in this browser.
    </div>

    <template v-else>
      <div class="demo-card flex items-center justify-between p-4">
        <div>
          <div class="demo-label">
            Permission
          </div>
          <div class="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <span
              class="inline-block size-2 rounded-full transition"
              :class="permissionGranted ? 'bg-emerald-500' : 'bg-border-strong'"
            />
            {{ permissionGranted ? 'Granted' : 'Not granted' }}
          </div>
        </div>
        <button
          class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="permissionGranted"
          @click="requestPermission"
        >
          {{ permissionGranted ? 'Allowed' : 'Request access' }}
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <label class="flex flex-col gap-1.5">
          <span class="demo-label">Title</span>
          <input
            v-model="title"
            type="text"
            class="demo-input"
          >
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="demo-label">Body</span>
          <textarea
            v-model="body"
            rows="2"
            class="demo-input resize-none"
          />
        </label>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!permissionGranted"
          @click="notify"
        >
          Show notification
        </button>
        <button
          class="demo-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!notification"
          @click="close"
        >
          Close
        </button>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-border bg-bg-inset p-3 text-sm">
        <span class="demo-label">Last event</span>
        <span class="font-mono text-fg">{{ lastEvent || '—' }}</span>
      </div>

      <p v-if="!permissionGranted" class="text-xs text-fg-subtle">
        Grant access first, then trigger a notification. Switch back to this tab and it auto-closes.
      </p>
    </template>
  </div>
</template>
