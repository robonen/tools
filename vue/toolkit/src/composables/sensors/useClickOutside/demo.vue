<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useClickOutside } from './index';

const open = ref(false);
const dismissals = ref(0);

const menu = useTemplateRef<HTMLElement>('menu');

// Close the menu whenever a pointer-down lands outside it.
useClickOutside(menu, () => {
  if (open.value) {
    open.value = false;
    dismissals.value++;
  }
});

const options = ['Rename', 'Duplicate', 'Move to…', 'Archive'];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Click outside to dismiss</span>
      <p class="text-sm text-(--fg-muted)">
        Open the menu, then click anywhere outside it to close. Clicks inside keep it open.
      </p>
    </div>

    <div class="relative">
      <button
        ref="menu"
        type="button"
        class="inline-flex w-full items-center justify-between gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.99] cursor-pointer"
        @click="open = !open"
      >
        Document actions
        <span class="text-(--fg-subtle) transition" :class="{ 'rotate-180': open }">▾</span>

        <!-- The menu lives inside `target`, so clicks on its items count as inside -->
        <Transition
          enter-active-class="transition duration-100"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-100"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="open"
            class="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-(--border) bg-(--bg-elevated) shadow-lg"
          >
            <div
              v-for="option in options"
              :key="option"
              class="px-3 py-2 text-left text-sm text-(--fg) transition hover:bg-(--bg-inset)"
            >
              {{ option }}
            </div>
          </div>
        </Transition>
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 flex items-center justify-between font-mono text-sm text-(--fg) tabular-nums">
      <span class="text-(--fg-subtle)">outside dismissals</span>
      <span class="font-bold">{{ dismissals }}</span>
    </div>
  </div>
</template>
