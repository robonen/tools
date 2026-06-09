<script setup lang="ts">
import { ref } from 'vue';
import {
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from '@robonen/primitives';

interface ToastItem {
  id: number;
  title: string;
  description: string;
  open: boolean;
}

const toasts = ref<ToastItem[]>([]);
let nextId = 0;

function notify() {
  const id = nextId++;
  toasts.value.push({
    id,
    title: 'Message archived',
    description: 'Moved "Weekly digest" to your archive.',
    open: true,
  });
}

function undo(id: number) {
  const toast = toasts.value.find((t) => t.id === id);
  if (toast) toast.open = false;
}

// Drop a toast from the list once it has fully closed.
function remove(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
</script>

<template>
  <ToastProvider :duration="4000" swipe-direction="right">
    <div class="flex flex-col items-start gap-3 text-(--fg)">
      <button
        type="button"
        class="inline-flex items-center rounded-md bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
        @click="notify"
      >
        Archive message
      </button>
      <p class="text-xs text-(--fg-muted)">
        Toasts auto-dismiss after 4s. Hover the stack to pause the timer.
      </p>
    </div>

    <ToastRoot
      v-for="toast in toasts"
      :key="toast.id"
      v-model:open="toast.open"
      class="flex items-start gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) p-3 shadow-lg data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
      @update:open="(open) => !open && remove(toast.id)"
    >
      <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <svg
          class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <div class="min-w-0 flex-1">
        <ToastTitle class="text-sm font-semibold text-(--fg)">
          {{ toast.title }}
        </ToastTitle>
        <ToastDescription class="mt-0.5 text-sm text-(--fg-muted)">
          {{ toast.description }}
        </ToastDescription>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <ToastAction
          alt-text="Undo archiving this message"
          class="rounded-md border border-(--border) bg-(--bg) px-2 py-1 text-xs font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
          @click="undo(toast.id)"
        >
          Undo
        </ToastAction>
        <ToastClose
          aria-label="Dismiss"
          class="inline-flex size-6 items-center justify-center rounded-md text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
        >
          <svg
            class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </ToastClose>
      </div>
    </ToastRoot>

    <ToastViewport
      class="fixed bottom-4 right-4 z-50 flex w-[min(92vw,22rem)] flex-col gap-2 outline-none"
    />
  </ToastProvider>
</template>
