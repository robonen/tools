<script setup lang="ts">
import { ref } from 'vue';
import { usePageLeave } from './index';

const leaveCount = ref(0);

// Single readonly ref — bind directly. onChange fires when the flag flips.
const hasLeft = usePageLeave({
  onChange: (isLeft) => {
    if (isLeft)
      leaveCount.value += 1;
  },
});
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      class="flex flex-col items-center gap-3 rounded-xl border p-8 transition-colors duration-300"
      :class="hasLeft
        ? 'border-(--accent) bg-(--accent)/10'
        : 'border-(--border) bg-(--bg-inset)'"
    >
      <span
        class="flex size-16 items-center justify-center rounded-full text-2xl transition-all duration-300"
        :class="hasLeft ? 'scale-110 bg-(--accent) text-(--accent-fg)' : 'bg-(--bg-elevated) text-(--fg-subtle)'"
      >
        {{ hasLeft ? '👋' : '👀' }}
      </span>
      <p
        class="text-base font-semibold transition-colors duration-300"
        :class="hasLeft ? 'text-(--accent-text)' : 'text-(--fg)'"
      >
        {{ hasLeft ? 'Come back!' : 'Pointer is on the page' }}
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
        <span class="text-sm text-(--fg-muted)">State</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition"
          :class="hasLeft
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
        >
          <span class="size-1.5 rounded-full" :class="hasLeft ? 'bg-amber-500' : 'bg-emerald-500'" />
          {{ hasLeft ? 'Left' : 'Inside' }}
        </span>
      </div>
      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2.5">
        <span class="text-sm text-(--fg-muted)">Exits</span>
        <span class="font-mono text-sm font-bold tabular-nums text-(--fg)">{{ leaveCount }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Move your cursor out of the browser viewport &mdash; the classic <span class="font-medium text-(--fg-muted)">exit-intent</span> signal for save-cart prompts and the like.
    </p>
  </div>
</template>
