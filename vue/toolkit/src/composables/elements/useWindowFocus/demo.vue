<script setup lang="ts">
import { ref, watch } from 'vue';
import { useWindowFocus } from './index';

// useWindowFocus returns a single ShallowRef<boolean> — bind it directly.
const focused = useWindowFocus();

const blurCount = ref(0);

watch(focused, (isFocused) => {
  if (!isFocused)
    blurCount.value++;
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Window focus</span>

    <div
      class="rounded-xl border p-6 text-center transition"
      :class="focused
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-(--border) bg-(--bg-inset)'"
    >
      <div
        class="mx-auto flex size-14 items-center justify-center rounded-full transition"
        :class="focused
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-(--bg-elevated) text-(--fg-subtle)'"
      >
        <span class="size-3 rounded-full transition" :class="focused ? 'bg-emerald-500 animate-pulse' : 'bg-(--fg-subtle)'" />
      </div>
      <div class="mt-3 text-lg font-semibold text-(--fg)">
        {{ focused ? 'Window focused' : 'Window blurred' }}
      </div>
      <p class="mt-1 text-sm text-(--fg-muted)">
        {{ focused ? 'Click outside or switch apps to blur.' : 'Click back into this window to refocus.' }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ focused ? 'on' : 'off' }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">focused</div>
      </div>
      <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-center">
        <div class="font-mono text-3xl font-bold tabular-nums text-(--fg)">{{ blurCount }}</div>
        <div class="text-[10px] uppercase tracking-wide text-(--fg-subtle)">times blurred</div>
      </div>
    </div>
  </div>
</template>
