<script setup lang="ts">
import { ref } from 'vue';
import { useDark } from './index';

const target = ref<HTMLElement>();

// Scope the toggle to the demo card via a data attribute so it does not
// override the docs site's own theme. `storageKey: null` keeps it in memory.
const isDark = useDark({
  selector: target,
  attribute: 'data-demo-mode',
  valueDark: 'dark',
  valueLight: 'light',
  storageKey: null,
});

function toggle() {
  isDark.value = !isDark.value;
}
</script>

<template>
  <div
    ref="target"
    data-demo-mode
    class="flex w-full max-w-sm flex-col gap-4"
  >
    <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center gap-3">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-colors"
          :class="isDark
            ? 'bg-indigo-500/15 text-indigo-400'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'"
        >
          {{ isDark ? '☾' : '☀' }}
        </span>
        <div>
          <p class="text-sm font-medium text-(--fg)">{{ isDark ? 'Dark mode' : 'Light mode' }}</p>
          <p class="text-xs text-(--fg-subtle)">isDark = {{ isDark }}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        :aria-checked="isDark"
        class="relative inline-flex h-7 w-12 items-center rounded-full border border-(--border) transition focus:outline-none focus:ring-2 focus:ring-(--ring) cursor-pointer"
        :class="isDark ? 'bg-(--accent)' : 'bg-(--bg-inset)'"
        @click="toggle"
      >
        <span
          class="inline-block h-5 w-5 transform rounded-full bg-(--bg) shadow transition-transform"
          :class="isDark ? 'translate-x-6' : 'translate-x-1'"
        />
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="mb-2 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Preview surface</p>
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          data-demo-mode = "{{ isDark ? 'dark' : 'light' }}"
        </span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Writing the boolean toggles the attribute on this card. When the requested state
      matches your OS preference, <code class="font-mono text-(--fg-muted)">useDark</code>
      falls back to <code class="font-mono text-(--fg-muted)">auto</code> to keep tracking it.
    </p>
  </div>
</template>
