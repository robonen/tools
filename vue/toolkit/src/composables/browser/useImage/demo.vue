<script setup lang="ts">
import { computed, ref } from 'vue';
import { useImage } from './index';

const samples = [
  { label: 'Mountains', src: 'https://picsum.photos/id/1018/640/400' },
  { label: 'Forest', src: 'https://picsum.photos/id/1015/640/400' },
  { label: 'Broken URL', src: 'https://picsum.photos/this-image-does-not-exist.jpg' },
];

const current = ref(0);
const src = computed(() => samples[current.value]!.src);

// Reactive getter source: useImage reloads whenever `src` changes.
const { isLoading, isReady, error, state, execute } = useImage(
  () => ({ src: src.value, alt: samples[current.value]!.label }),
);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(sample, index) in samples"
        :key="sample.src"
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="current === index
          ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
        @click="current = index"
      >
        {{ sample.label }}
      </button>
    </div>

    <div class="relative aspect-[8/5] w-full overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset)">
      <Transition
        enter-active-class="transition duration-300"
        enter-from-class="opacity-0 scale-[1.02]"
        leave-active-class="transition duration-200"
        leave-to-class="opacity-0"
      >
        <img
          v-if="isReady && state"
          :key="src"
          :src="state.src"
          :alt="state.alt"
          class="h-full w-full object-cover"
        >
        <div
          v-else-if="error"
          class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center"
        >
          <span class="text-2xl">⚠️</span>
          <p class="text-sm font-medium text-red-600 dark:text-red-400">
            Failed to load image
          </p>
        </div>
        <div
          v-else
          class="absolute inset-0 flex flex-col items-center justify-center gap-3"
        >
          <span class="h-7 w-7 animate-spin rounded-full border-2 border-(--border-strong) border-t-(--accent)" />
          <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
            Loading…
          </p>
        </div>
      </Transition>
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="isLoading
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : isReady
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'"
        >
          {{ isLoading ? 'loading' : isReady ? 'ready' : 'error' }}
        </span>
        <span
          v-if="isReady && state"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) tabular-nums"
        >
          {{ state.naturalWidth }}×{{ state.naturalHeight }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="isLoading"
        @click="execute()"
      >
        Reload
      </button>
    </div>
  </div>
</template>
