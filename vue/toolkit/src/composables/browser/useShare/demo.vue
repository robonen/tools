<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useShare } from './index';

const payload = reactive({
  title: 'Vue Toolkit',
  text: 'A collection of essential Vue composables.',
  url: 'https://vuejs.org',
});

const { share, isSupported } = useShare(payload);

const lastResult = ref<'shared' | 'dismissed' | null>(null);

async function onShare() {
  lastResult.value = null;
  try {
    await share();
    lastResult.value = 'shared';
  }
  catch {
    // User dismissed the share sheet (AbortError) — treat as a non-error.
    lastResult.value = 'dismissed';
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Web Share API
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        :class="isSupported
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isSupported ? 'bg-emerald-500' : 'bg-(--fg-subtle)'"
        />
        {{ isSupported ? 'Supported' : 'Unsupported' }}
      </span>
    </div>

    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Title</span>
        <input
          v-model="payload.title"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Text</span>
        <input
          v-model="payload.text"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">URL</span>
        <input
          v-model="payload.url"
          type="url"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </label>
    </div>

    <button
      type="button"
      :disabled="!isSupported"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
      @click="onShare"
    >
      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      Share
    </button>

    <p v-if="!isSupported" class="text-xs leading-relaxed text-(--fg-subtle)">
      The Web Share API is not available in this browser. It works on most mobile
      browsers and Safari.
    </p>
    <p
      v-else-if="lastResult"
      class="text-xs font-medium"
      :class="lastResult === 'shared'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-(--fg-muted)'"
    >
      {{ lastResult === 'shared' ? 'Content shared.' : 'Share sheet dismissed.' }}
    </p>
  </div>
</template>
