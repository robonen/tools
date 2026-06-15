<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDocumentVisibility } from './index';

const switches = ref(0);
const lastHidden = ref<string | null>(null);

const visibility = useDocumentVisibility({
  onChange: (state) => {
    if (state === 'hidden') {
      switches.value += 1;
      lastHidden.value = new Date().toLocaleTimeString();
    }
  },
});

const isVisible = computed(() => visibility.value === 'visible');
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col items-center gap-3 text-center">
      <span
        class="flex size-14 items-center justify-center rounded-full text-2xl transition"
        :class="isVisible
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'"
      >
        {{ isVisible ? '👁️' : '💤' }}
      </span>
      <div>
        <p class="demo-stat text-2xl">
          {{ visibility }}
        </p>
        <p class="text-xs text-fg-subtle">
          {{ isVisible ? 'This tab is in the foreground' : 'This tab is hidden' }}
        </p>
      </div>
    </div>

    <p class="text-center text-xs text-fg-subtle">
      Switch to another tab or minimize the window to watch this update.
    </p>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <p class="demo-stat text-3xl">
          {{ switches }}
        </p>
        <p class="demo-label mt-0.5">
          Times hidden
        </p>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <p class="font-mono text-sm font-medium tabular-nums text-fg truncate">
          {{ lastHidden ?? '—' }}
        </p>
        <p class="demo-label mt-0.5">
          Last hidden at
        </p>
      </div>
    </div>
  </div>
</template>
