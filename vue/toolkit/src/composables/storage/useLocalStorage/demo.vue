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
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">Persisted settings</span>
      <span class="demo-badge">
        localStorage
      </span>
    </div>

    <div class="demo-card p-4 flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="demo-label">Username</span>
        <input
          v-model="username"
          type="text"
          placeholder="your handle"
          class="demo-input"
        >
      </label>

      <label class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="demo-label">Font size</span>
          <span class="font-mono text-sm tabular-nums text-fg-muted">{{ fontSize }}px</span>
        </div>
        <input
          v-model.number="fontSize"
          type="range"
          min="12"
          max="28"
          step="1"
          class="w-full accent-accent"
        >
      </label>

      <button
        type="button"
        :aria-pressed="darkMode"
        class="flex items-center justify-between rounded-lg border border-border bg-bg-inset px-3 py-2 text-sm font-medium text-fg transition hover:border-border-strong cursor-pointer"
        @click="darkMode = !darkMode"
      >
        <span>Dark mode</span>
        <span
          class="relative h-5 w-9 rounded-full transition"
          :class="darkMode ? 'bg-accent' : 'bg-border-strong'"
        >
          <span
            class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
            :class="darkMode ? 'left-4' : 'left-0.5'"
          />
        </span>
      </button>
    </div>

    <pre
      class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-xs leading-relaxed text-fg overflow-auto"
      :style="{ fontSize: `${fontSize}px` }"
    >{{ persistedJson }}</pre>

    <p class="text-xs text-fg-subtle">
      Edit anything, then reload the page or open a second tab — values stay in sync.
    </p>

    <button
      type="button"
      class="demo-btn"
      @click="reset"
    >
      Reset to defaults
    </button>
  </div>
</template>
