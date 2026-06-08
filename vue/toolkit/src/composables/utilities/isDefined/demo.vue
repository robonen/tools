<script setup lang="ts">
import { computed, ref } from 'vue';
import { isDefined, useIsDefined } from './index';

interface Profile {
  name: string;
  email: string;
}

// A value that toggles between a real object and `null` — the classic
// "data not loaded yet" case `isDefined` is built to narrow.
const profile = ref<Profile | null>({ name: 'Ada Lovelace', email: 'ada@analytical.engine' });

// Reactive guard: re-evaluates automatically whenever `profile` changes.
const ready = useIsDefined(profile);

// Synchronous one-off guard, used inside a normal computed below.
const greeting = computed(() => {
  // After this check TypeScript narrows `profile.value` to `Profile`.
  if (isDefined(profile))
    return `Welcome back, ${profile.value.name}`;

  return 'No profile loaded';
});

function load(): void {
  profile.value = { name: 'Grace Hopper', email: 'grace@navy.mil' };
}

function clear(): void {
  profile.value = null;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">useIsDefined(profile)</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold transition"
        :class="ready
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        <span class="size-2 rounded-full" :class="ready ? 'bg-emerald-500' : 'bg-amber-500'" />
        {{ ready ? 'defined' : 'nullish' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">narrowed read</p>
      <p class="mt-1 text-base font-semibold text-(--fg)">{{ greeting }}</p>
      <p
        v-if="isDefined(profile)"
        class="mt-1 font-mono text-sm text-(--fg-muted)"
      >
        {{ profile.email }}
      </p>
      <p v-else class="mt-1 text-sm italic text-(--fg-subtle)">
        Waiting for data…
      </p>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="ready"
        @click="load"
      >
        Load profile
      </button>
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="!ready"
        @click="clear"
      >
        Clear
      </button>
    </div>
  </div>
</template>
