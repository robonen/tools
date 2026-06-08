<script setup lang="ts">
import { ref } from 'vue';
import { useWakeLock } from './index';

const { isSupported, isActive, sentinel, request, release } = useWakeLock();

const error = ref<string | null>(null);

async function toggle(): Promise<void> {
  error.value = null;
  try {
    if (sentinel.value)
      await release();
    else
      await request('screen');
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      The Screen Wake Lock API is not supported in this browser.
    </div>

    <div class="flex flex-col items-center gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-6">
      <div
        class="flex size-16 items-center justify-center rounded-full border transition"
        :class="isActive
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)'"
      >
        <svg viewBox="0 0 24 24" fill="none" class="size-7">
          <rect x="4" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
          <path d="M8 21h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path v-if="isActive" d="m9 9 2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="text-center">
        <p class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ isActive ? 'AWAKE' : 'IDLE' }}
        </p>
        <p class="mt-1 text-xs text-(--fg-muted)">
          {{ isActive ? 'Screen will stay on' : 'Screen may sleep normally' }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5 text-sm">
      <span class="text-(--fg-muted)">Lock held</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ sentinel ? 'yes' : 'none' }}
      </span>
    </div>

    <button
      type="button"
      :disabled="!isSupported"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      @click="toggle"
    >
      {{ sentinel ? 'Release wake lock' : 'Request wake lock' }}
    </button>

    <p v-if="error" class="text-xs text-red-600 dark:text-red-400">
      {{ error }}
    </p>
    <p v-else class="text-xs text-(--fg-subtle)">
      The lock auto-releases when the tab is hidden and re-acquires when visible again.
    </p>
  </div>
</template>
