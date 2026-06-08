<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAsyncState } from './index';

interface Profile {
  name: string;
  role: string;
  commits: number;
}

const roster: Profile[] = [
  { name: 'Ada Lovelace', role: 'Staff Engineer', commits: 1843 },
  { name: 'Grace Hopper', role: 'Compiler Lead', commits: 2056 },
  { name: 'Alan Turing', role: 'Research', commits: 974 },
];

// Simulated request: succeeds with a roster entry, or rejects to show error UI.
function fetchProfile(id: number): Promise<Profile> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id < 0) {
        reject(new Error('Profile not found (404)'));
        return;
      }
      resolve(roster[id % roster.length]!);
    }, 800);
  });
}

const id = ref(0);

const { state, isLoading, isReady, error, execute } = useAsyncState<Profile | null, [number]>(
  args => fetchProfile(args),
  null,
  { immediate: false, resetOnExecute: true },
);

const errorMessage = computed(() => (error.value instanceof Error ? error.value.message : String(error.value)));

function load() {
  // Re-trigger with no delay, passing the current id as a param.
  execute(0, id.value);
}

function loadMissing() {
  execute(0, -1);
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4 min-h-40">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Profile</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          <span
            class="size-1.5 rounded-full transition"
            :class="isLoading ? 'bg-amber-500 animate-pulse' : isReady ? 'bg-emerald-500' : error ? 'bg-red-500' : 'bg-(--fg-subtle)'"
          />
          {{ isLoading ? 'Loading' : isReady ? 'Ready' : error ? 'Error' : 'Idle' }}
        </span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="flex items-center gap-3">
        <div class="size-12 shrink-0 rounded-full bg-(--bg-inset) animate-pulse" />
        <div class="flex flex-1 flex-col gap-2">
          <div class="h-3.5 w-2/3 rounded bg-(--bg-inset) animate-pulse" />
          <div class="h-3 w-1/2 rounded bg-(--bg-inset) animate-pulse" />
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </div>

      <!-- Loaded data -->
      <div v-else-if="state" class="flex items-center gap-3">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--accent-subtle) text-lg font-semibold text-(--accent-text)">
          {{ state.name.charAt(0) }}
        </div>
        <div class="flex flex-1 flex-col">
          <span class="font-semibold text-(--fg)">{{ state.name }}</span>
          <span class="text-sm text-(--fg-muted)">{{ state.role }}</span>
          <span class="font-mono text-xs tabular-nums text-(--fg-subtle)">{{ state.commits.toLocaleString() }} commits</span>
        </div>
      </div>

      <!-- Idle / empty -->
      <div v-else class="flex flex-1 items-center justify-center text-sm text-(--fg-subtle)">
        Press “Load” to fetch a profile.
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="profile-id">Profile id</label>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">#{{ id }}</span>
      </div>
      <input
        id="profile-id"
        v-model.number="id"
        type="range"
        min="0"
        max="5"
        step="1"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        :disabled="isLoading"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="load"
      >
        {{ isLoading ? 'Loading…' : 'Load' }}
      </button>
      <button
        type="button"
        :disabled="isLoading"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="loadMissing"
      >
        Trigger error
      </button>
    </div>
  </div>
</template>
