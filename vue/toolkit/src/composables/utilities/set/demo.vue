<script setup lang="ts">
import { reactive, ref } from 'vue';
import { set } from './index';

// Two-argument form: write straight to a ref.
const volume = ref(60);

function nudge(delta: number): void {
  // set(ref, value) — equivalent to volume.value = ...
  set(volume, Math.min(100, Math.max(0, volume.value + delta)));
}

// Three-argument form: mutate a single property of an object.
const profile = reactive({
  name: 'Grace Hopper',
  status: 'online' as 'online' | 'away' | 'offline',
});

const statuses = ['online', 'away', 'offline'] as const;
const statusDot: Record<typeof statuses[number], string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-(--fg-subtle)',
};

function rename(): void {
  const names = ['Grace Hopper', 'Ada Lovelace', 'Alan Turing', 'Katherine Johnson'];
  const next = names[(names.indexOf(profile.name) + 1) % names.length];
  // set(object, key, value) — equivalent to profile.name = next
  set(profile, 'name', next);
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-5">
    <div class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">set(volume, n)</span>
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ volume }}</span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-(--bg-inset)">
        <div
          class="h-full rounded-full bg-(--accent) transition-[width] duration-200"
          :style="{ width: `${volume}%` }"
        />
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="nudge(-10)"
        >
          −10
        </button>
        <button
          type="button"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="nudge(10)"
        >
          +10
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">set(profile, key, value)</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          <span class="size-2 rounded-full" :class="statusDot[profile.status]" />
          {{ profile.status }}
        </span>
      </div>
      <p class="font-mono text-lg font-semibold text-(--fg)">{{ profile.name }}</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="s in statuses"
          :key="s"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
          :class="profile.status === s
            ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
            : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
          @click="set(profile, 'status', s)"
        >
          {{ s }}
        </button>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="rename"
      >
        Set next name
      </button>
    </div>
  </div>
</template>
