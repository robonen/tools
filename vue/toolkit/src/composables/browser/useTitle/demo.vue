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
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4">
      <span class="demo-label">
        Live document title
      </span>
      <div class="mt-2 flex items-center gap-2 rounded-lg border border-border bg-bg-inset px-3 py-2.5">
        <svg viewBox="0 0 24 24" fill="none" class="size-4 shrink-0 text-fg-subtle">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <span class="truncate font-mono text-sm text-fg">
          {{ title || 'Untitled' }} · {{ appName }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="demo-label">
        Page title
      </label>
      <input
        v-model="title"
        type="text"
        placeholder="Enter a page title"
        class="demo-input"
      >
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="demo-label">
        App name (template suffix)
      </label>
      <input
        v-model="appName"
        type="text"
        class="demo-input"
      >
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="demo-btn"
        :class="title === preset ? 'border-accent text-accent-text' : ''"
        @click="title = preset"
      >
        {{ preset }}
      </button>
    </div>

    <p class="text-xs text-fg-subtle">
      Check your browser tab — it updates in real time.
    </p>
  </div>
</template>
