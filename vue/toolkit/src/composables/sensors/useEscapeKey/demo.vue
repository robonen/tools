<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEscapeKey } from './index';

// Stack of open layers — useEscapeKey only fires the topmost handler, so
// Escape peels them off one at a time (outer panel, then inner dialog).
const panelOpen = ref(false);
const dialogOpen = ref(false);

const lastDismissed = ref<string | null>(null);

let stopPanel: (() => void) | undefined;
let stopDialog: (() => void) | undefined;

// Only register a handler while the layer is actually open. The most recently
// registered (topmost) one wins for a given Escape press.
watch(panelOpen, (open) => {
  if (open) {
    stopPanel = useEscapeKey(() => {
      panelOpen.value = false;
      lastDismissed.value = 'panel';
    });
  }
  else {
    stopPanel?.();
    stopPanel = undefined;
  }
});

watch(dialogOpen, (open) => {
  if (open) {
    stopDialog = useEscapeKey(() => {
      dialogOpen.value = false;
      lastDismissed.value = 'dialog';
    });
  }
  else {
    stopDialog?.();
    stopDialog = undefined;
  }
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Escape Stack</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          {{ (panelOpen ? 1 : 0) + (dialogOpen ? 1 : 0) }} open
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="panelOpen = true"
      >
        Open panel
      </button>

      <!-- Outer layer -->
      <div
        v-if="panelOpen"
        class="flex flex-col gap-3 rounded-lg border border-(--border-strong) bg-(--bg-inset) p-3"
      >
        <p class="text-sm text-(--fg)">
          Panel open. Press <kbd class="rounded border border-(--border) bg-(--bg-elevated) px-1.5 py-0.5 font-mono text-xs text-(--fg)">Esc</kbd> to dismiss, or open a nested dialog on top.
        </p>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="dialogOpen = true"
        >
          Open nested dialog
        </button>

        <!-- Inner layer: topmost, so Escape closes this first -->
        <div
          v-if="dialogOpen"
          class="flex items-center justify-between gap-2 rounded-lg border border-(--accent) bg-(--accent-subtle) p-3"
        >
          <p class="text-sm text-(--accent-text)">
            Nested dialog — Esc closes me before the panel.
          </p>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
            top
          </span>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) flex items-center justify-between">
      <span class="text-(--fg-subtle)">last dismissed via Esc</span>
      <span class="text-(--accent-text)">{{ lastDismissed ?? '—' }}</span>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Only the topmost layer responds to a single Escape press, so nested dismissables close in the right order.
    </p>
  </div>
</template>
