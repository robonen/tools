<script setup lang="ts">
import { ref, watch } from 'vue';
import { useTitle } from './index';

const appName = ref('Toolkit');

// Two-way bound to document.title, formatted through the template.
const title = useTitle('Dashboard', {
  titleTemplate: (t) => `${t} · ${appName.value}`,
});

const presets = ['Dashboard', 'Inbox', 'Settings', 'Billing'];

// Re-apply the template when the app name changes by re-writing the title.
watch(appName, () => {
  // eslint-disable-next-line no-self-assign
  title.value = title.value;
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Live document title
      </span>
      <div class="mt-2 flex items-center gap-2 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-(--fg-subtle)">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <span class="truncate font-mono text-sm text-(--fg)">
          {{ title || 'Untitled' }} · {{ appName }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Page title
      </label>
      <input
        v-model="title"
        type="text"
        placeholder="Enter a page title"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        App name (template suffix)
      </label>
      <input
        v-model="appName"
        type="text"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        :class="title === preset ? 'border-(--accent) text-(--accent-text)' : ''"
        @click="title = preset"
      >
        {{ preset }}
      </button>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Check your browser tab — it updates in real time.
    </p>
  </div>
</template>
