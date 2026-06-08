<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredLanguages } from './index';

const languages = usePreferredLanguages();

// Resolve a human-friendly name + flag for each BCP-47 tag where possible.
const displayNames = computed(() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' });
  }
  catch {
    return undefined;
  }
});

function nameOf(tag: string): string {
  return displayNames.value?.of(tag) ?? tag;
}

function flagOf(tag: string): string {
  const region = tag.split('-')[1]?.toUpperCase();
  if (!region || region.length !== 2)
    return '🌐';
  // Convert a 2-letter region code to a flag emoji.
  return String.fromCodePoint(...[...region].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

const primary = computed(() => languages.value[0] ?? 'en');
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        navigator.languages
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ languages.length }} {{ languages.length === 1 ? 'locale' : 'locales' }}
      </span>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Primary language
      </span>
      <div class="mt-1 flex items-center gap-2.5">
        <span class="text-2xl leading-none">{{ flagOf(primary) }}</span>
        <span class="flex flex-col">
          <span class="text-base font-semibold text-(--fg)">{{ nameOf(primary) }}</span>
          <span class="font-mono text-xs text-(--fg-subtle)">{{ primary }}</span>
        </span>
      </div>
    </div>

    <ol class="flex flex-col gap-2">
      <li
        v-for="(lang, index) in languages"
        :key="`${lang}-${index}`"
        class="flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2"
      >
        <span class="w-5 text-center font-mono text-xs text-(--fg-subtle) tabular-nums">
          {{ index + 1 }}
        </span>
        <span class="text-lg leading-none">{{ flagOf(lang) }}</span>
        <span class="flex flex-1 flex-col">
          <span class="text-sm font-medium text-(--fg)">{{ nameOf(lang) }}</span>
          <span class="font-mono text-xs text-(--fg-subtle)">{{ lang }}</span>
        </span>
        <span
          v-if="index === 0"
          class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          preferred
        </span>
      </li>
    </ol>

    <p class="text-xs text-(--fg-subtle)">
      Read-only: updates automatically on the browser's <span class="font-mono">languagechange</span> event.
    </p>
  </div>
</template>
