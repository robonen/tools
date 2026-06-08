<script setup lang="ts">
import { computed } from 'vue';
import { useLocalStorage } from './index';

// Persists across reloads and syncs across tabs via the `storage` event.
const username = useLocalStorage('demo:username', 'ada-lovelace');
const fontSize = useLocalStorage('demo:font-size', 16);
const darkMode = useLocalStorage('demo:dark-mode', false);

// Object value — serialized as JSON automatically.
const profile = useLocalStorage('demo:profile', {
  role: 'Engineer',
  team: 'Platform',
});

const persistedJson = computed(() =>
  JSON.stringify(
    { username: username.value, fontSize: fontSize.value, darkMode: darkMode.value, profile: profile.value },
    null,
    2,
  ),
);

function reset() {
  // Assigning null removes the key; the ref falls back to its default on next read.
  username.value = null as never;
  fontSize.value = 16;
  darkMode.value = false;
  profile.value = { role: 'Engineer', team: 'Platform' };
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Persisted settings</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        localStorage
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Username</span>
        <input
          v-model="username"
          type="text"
          placeholder="your handle"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>

      <label class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Font size</span>
          <span class="font-mono text-sm tabular-nums text-(--fg-muted)">{{ fontSize }}px</span>
        </div>
        <input
          v-model.number="fontSize"
          type="range"
          min="12"
          max="28"
          step="1"
          class="w-full accent-(--accent)"
        >
      </label>

      <button
        type="button"
        :aria-pressed="darkMode"
        class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-sm font-medium text-(--fg) transition hover:border-(--border-strong) cursor-pointer"
        @click="darkMode = !darkMode"
      >
        <span>Dark mode</span>
        <span
          class="relative h-5 w-9 rounded-full transition"
          :class="darkMode ? 'bg-(--accent)' : 'bg-(--border-strong)'"
        >
          <span
            class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
            :class="darkMode ? 'left-4' : 'left-0.5'"
          />
        </span>
      </button>
    </div>

    <pre
      class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs leading-relaxed text-(--fg) overflow-auto"
      :style="{ fontSize: `${fontSize}px` }"
    >{{ persistedJson }}</pre>

    <p class="text-xs text-(--fg-subtle)">
      Edit anything, then reload the page or open a second tab — values stay in sync.
    </p>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="reset"
    >
      Reset to defaults
    </button>
  </div>
</template>
