<script setup lang="ts">
import { computed, ref } from 'vue';
import { useOtpCredentials } from './index';

const { isSupported, code, isReceiving, receive, abort, onReceive, onError } = useOtpCredentials();

// A local, dismissible presentation error: the composable only clears its own
// `error` when a new request starts, so we mirror it here and clear it whenever
// the user takes over manually — otherwise a single failed read would pin the
// status indicator permanently.
const hint = ref<string | null>(null);
onError(() => { hint.value = 'Couldn’t read the code automatically — enter it manually.'; });
onReceive(() => { hint.value = null; });

const status = computed(() => {
  if (hint.value)
    return { label: hint.value, tone: 'error' as const };
  if (isReceiving.value)
    return { label: 'Waiting for the SMS code…', tone: 'pending' as const };
  if (code.value)
    return { label: 'Code received', tone: 'ok' as const };
  return { label: 'Idle', tone: 'idle' as const };
});

function listen() {
  hint.value = null;
  receive();
}

function onInput(event: Event) {
  hint.value = null;
  code.value = (event.target as HTMLInputElement).value;
}

// WebOTP only works on a device that can receive the SMS (Chrome Android), so
// on desktop we let you simulate the auto-fill the API would normally perform.
function simulate() {
  hint.value = null;
  code.value = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">WebOTP</span>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        {{ isSupported ? 'supported' : 'unsupported' }}
      </span>
    </div>

    <input
      :value="code ?? ''"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      placeholder="••••••"
      class="w-full rounded-xl border border-(--border) bg-(--bg-inset) px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] tabular-nums text-(--fg) outline-none transition focus:border-(--accent)"
      @input="onInput"
    >

    <div class="flex gap-2">
      <button
        v-if="!isReceiving"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="listen"
      >
        Listen for code
      </button>
      <button
        v-else
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) px-3 py-1.5 text-sm font-medium text-(--fg-muted) transition hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="abort()"
      >
        Cancel
      </button>
      <button
        class="inline-flex items-center justify-center rounded-lg border border-(--border) px-3 py-1.5 text-sm font-medium text-(--fg-muted) transition hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="simulate"
      >
        Simulate
      </button>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <span
        class="size-2 rounded-full"
        :class="{
          'bg-(--fg-subtle)': status.tone === 'idle',
          'animate-pulse bg-amber-500': status.tone === 'pending',
          'bg-emerald-500': status.tone === 'ok',
          'bg-red-500': status.tone === 'error',
        }"
      />
      <span class="text-(--fg-muted)">{{ status.label }}</span>
    </div>
  </div>
</template>
