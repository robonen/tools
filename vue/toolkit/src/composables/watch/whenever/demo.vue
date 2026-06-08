<script setup lang="ts">
import { computed, ref } from 'vue';
import { whenever } from './index';

const code = ref('');
const isValid = computed(() => code.value.length >= 6);
const events = ref<{ id: number; at: string }[]>([]);
let counter = 0;

// Fires only when the gate transitions into a truthy (valid) state.
whenever(isValid, () => {
  events.value.unshift({
    id: ++counter,
    at: new Date().toLocaleTimeString(undefined, { hour12: false }),
  });
  if (events.value.length > 5)
    events.value.length = 5;
});

// `once` variant — fires a single celebration the first time we hit 12 chars.
const celebrated = ref(false);
whenever(() => code.value.length >= 12, () => {
  celebrated.value = true;
}, { once: true });
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Access code
      </label>
      <input
        v-model="code"
        type="text"
        placeholder="Enter at least 6 characters"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
      <div class="flex items-center justify-between text-xs">
        <span class="text-(--fg-subtle)">{{ code.length }} / 6 chars</span>
        <span
          class="font-medium"
          :class="isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-subtle)'"
        >
          {{ isValid ? 'valid' : 'too short' }}
        </span>
      </div>
    </div>

    <div
      v-if="celebrated"
      class="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-600 dark:text-sky-400"
    >
      Reached 12+ characters — this fired exactly once.
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Became valid at
      </div>
      <ul v-if="events.length" class="flex flex-col gap-1.5">
        <li
          v-for="event in events"
          :key="event.id"
          class="flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2"
        >
          <span class="size-1.5 rounded-full bg-emerald-500" />
          <span class="font-mono text-sm text-(--fg) tabular-nums">{{ event.at }}</span>
        </li>
      </ul>
      <p v-else class="py-2 text-sm text-(--fg-subtle)">
        The callback only runs when the source turns truthy — type a valid code to log an event, then clear it and try again.
      </p>
    </div>

    <p class="text-xs text-(--fg-muted)">
      Unlike a plain <code class="rounded bg-(--bg-inset) px-1 py-0.5 font-mono">watch</code>, the callback skips every falsy transition.
    </p>
  </div>
</template>
