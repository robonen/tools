<script setup lang="ts">
import { computed, ref } from 'vue';
import { useScreenOrientation } from './index';
import type { OrientationLockType } from './index';

const { isSupported, orientation, angle, lockOrientation, unlockOrientation } = useScreenOrientation();

const error = ref<string | null>(null);
const locked = ref<OrientationLockType | null>(null);

const locks: OrientationLockType[] = ['portrait', 'landscape', 'any'];

const isLandscape = computed(() => orientation.value?.startsWith('landscape') ?? false);

async function applyLock(type: OrientationLockType) {
  error.value = null;
  try {
    await lockOrientation(type);
    locked.value = type;
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Lock failed';
  }
}

function release() {
  unlockOrientation();
  locked.value = null;
  error.value = null;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <template v-if="isSupported">
      <div class="grid place-items-center rounded-xl border border-(--border) bg-(--bg-inset) p-6">
        <div
          class="flex items-center justify-center rounded-lg border-2 border-(--border-strong) bg-(--bg-elevated) text-(--fg-subtle) transition-all duration-300"
          :class="isLandscape ? 'h-16 w-28' : 'h-28 w-16'"
        >
          <div class="size-2 rounded-full bg-(--accent)" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
          <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Orientation</div>
          <div class="mt-1 font-mono text-sm text-(--fg)">{{ orientation ?? '—' }}</div>
        </div>
        <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm tabular-nums text-(--fg)">
          <div class="font-sans text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Angle</div>
          <div class="mt-1">{{ angle }}&deg;</div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Lock to</div>
        <div class="flex gap-2">
          <button
            v-for="type in locks"
            :key="type"
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition active:scale-[0.98] cursor-pointer"
            :class="locked === type
              ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
              : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
            @click="applyLock(type)"
          >
            {{ type }}
          </button>
        </div>
        <button
          type="button"
          :disabled="!locked"
          class="inline-flex w-full items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          @click="release"
        >
          Unlock
        </button>
      </div>

      <p v-if="error" class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
        {{ error }}
      </p>
      <p v-else class="text-xs text-(--fg-subtle)">
        Locking requires fullscreen on most devices and is typically a no-op on desktop.
      </p>
    </template>

    <div
      v-else
      class="flex flex-col items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center"
    >
      <span class="text-sm font-medium text-amber-600 dark:text-amber-400">
        Screen Orientation API not supported
      </span>
      <span class="text-xs text-(--fg-subtle)">
        This browser does not expose <code class="font-mono">screen.orientation</code>.
      </span>
    </div>
  </div>
</template>
