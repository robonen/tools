<script setup lang="ts">
import { ref } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import { useBodyScrollLock } from './index';

// We acquire the lock imperatively on open and call the returned release on close,
// so the demo never holds the page scroll captive after the dialog dismisses.
const open = ref(false);
let release: VoidFunction | null = null;

function openModal(): void {
  if (open.value) return;
  open.value = true;
  release = useBodyScrollLock();
}

function closeModal(): void {
  if (!open.value) return;
  open.value = false;
  release?.();
  release = null;
}

const items = [
  'Inbox', 'Drafts', 'Sent', 'Archive', 'Spam',
  'Trash', 'Starred', 'Important', 'Snoozed', 'All mail',
];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Body scroll lock</span>
      <p class="text-sm text-(--fg-muted)">
        Open the dialog and try scrolling the page — the body is locked while it is open,
        scrollbar width compensated so nothing shifts.
      </p>
      <span
        class="inline-flex w-fit items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
      >
        <span class="size-1.5 rounded-full transition" :class="open ? 'bg-amber-500' : 'bg-emerald-500'" />
        {{ open ? 'Scroll locked' : 'Scroll free' }}
      </span>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
      @click="openModal"
    >
      Open dialog
    </button>

    <!-- Overlay rendered inline; lock acquired in openModal, released in closeModal -->
    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        @click.self="closeModal"
      >
        <div class="w-full max-w-sm rounded-xl border border-(--border) bg-(--bg-elevated) p-5 shadow-xl flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-(--fg)">Mailboxes</h3>
            <button
              type="button"
              class="rounded-md px-2 py-0.5 text-sm text-(--fg-muted) transition hover:bg-(--bg-inset) cursor-pointer"
              @click="closeModal"
            >
              Close
            </button>
          </div>
          <ul class="flex flex-col gap-1 max-h-48 overflow-y-auto">
            <li
              v-for="item in items"
              :key="item"
              class="rounded-md px-3 py-2 text-sm text-(--fg) transition hover:bg-(--bg-inset)"
            >
              {{ item }}
            </li>
          </ul>
          <p class="text-xs text-(--fg-subtle)">The list scrolls, the page behind it does not.</p>
        </div>
      </div>
    </Transition>
  </div>
</template>
