<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocalFonts } from './index';

const { isSupported, fonts, error, query } = useLocalFonts();

const loading = ref(false);
const filter = ref('');

async function pickFonts() {
  loading.value = true;
  try {
    await query();
  }
  finally {
    loading.value = false;
  }
}

const filtered = computed(() => {
  const term = filter.value.trim().toLowerCase();
  if (!term)
    return fonts.value;
  return fonts.value.filter(font => font.fullName.toLowerCase().includes(term));
});

// Unique families for the summary readout.
const familyCount = computed(() => new Set(fonts.value.map(font => font.family)).size);

// Render each face in its own font (quotes kept out of the template attribute).
function familyStyle(name: string) {
  return { fontFamily: `'${name}', sans-serif` };
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Local Font Access
      </p>
      <span
        v-if="fonts.length"
        class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums"
      >
        {{ fonts.length }} faces · {{ familyCount }} families
      </span>
    </div>

    <div
      v-if="!isSupported"
      class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300"
    >
      The Local Font Access API is not supported in this browser. Try a recent Chromium-based desktop browser.
    </div>

    <template v-else>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="loading"
        @click="pickFonts"
      >
        {{ loading ? 'Requesting permission…' : fonts.length ? 'Re-query fonts' : 'Enumerate installed fonts' }}
      </button>

      <p
        v-if="error"
        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      >
        Query failed — permission was likely denied.
      </p>

      <template v-if="fonts.length">
        <input
          v-model="filter"
          type="search"
          placeholder="Filter by name…"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >

        <ul class="max-h-56 divide-y divide-(--border) overflow-y-auto rounded-xl border border-(--border) bg-(--bg-elevated)">
          <li
            v-for="font in filtered"
            :key="font.postscriptName"
            class="flex items-baseline justify-between gap-3 px-3 py-2"
          >
            <span
              class="truncate text-base text-(--fg)"
              :style="familyStyle(font.fullName)"
            >
              {{ font.fullName }}
            </span>
            <span class="shrink-0 font-mono text-xs text-(--fg-subtle)">
              {{ font.style }}
            </span>
          </li>
          <li
            v-if="!filtered.length"
            class="px-3 py-6 text-center text-sm text-(--fg-subtle)"
          >
            No fonts match "{{ filter }}"
          </li>
        </ul>
      </template>

      <p
        v-else-if="!error && !loading"
        class="rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-6 text-center text-sm text-(--fg-subtle)"
      >
        Click above to grant the <code class="font-mono">local-fonts</code> permission and list your fonts.
      </p>
    </template>
  </div>
</template>
