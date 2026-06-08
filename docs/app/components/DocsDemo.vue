<script setup lang="ts">
import type { Component } from 'vue';

const props = defineProps<{
  component: Component;
  source: string;
}>();

const showSource = ref(false);

const { highlighted, highlightReactive } = useShiki();

watch(showSource, async (show) => {
  if (show && !highlighted.value) {
    await highlightReactive(props.source, 'vue');
  }
});
</script>

<template>
  <div class="rounded-xl border border-(--border) overflow-hidden">
    <!-- Live demo — client-only: demos are interactive and use browser APIs,
         so they must not be instantiated during SSR/prerender. -->
    <div class="p-4 sm:p-8 bg-(--bg-subtle) flex items-center justify-center min-h-32">
      <ClientOnly>
        <component :is="component" />
        <template #fallback>
          <div class="flex items-center gap-2 text-sm text-(--fg-subtle)">
            <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading demo…
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- Source toggle bar -->
    <div class="flex items-center border-t border-(--border) bg-(--bg-elevated)">
      <button
        type="button"
        class="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-(--fg-muted) hover:text-(--fg) transition-colors cursor-pointer"
        @click="showSource = !showSource"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        {{ showSource ? 'Hide source' : 'View source' }}
        <svg
          xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="transition-transform" :class="showSource ? 'rotate-180' : ''"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>

    <!-- Source code -->
    <div v-if="showSource" class="border-t border-(--border) bg-(--bg-subtle)">
      <div class="overflow-x-auto text-[13px] [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent!" v-html="highlighted" />
    </div>
  </div>
</template>
