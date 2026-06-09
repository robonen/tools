<script setup lang="ts">
import { ref } from 'vue';
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '@robonen/primitives';

const open = ref(false);

const goals = [
  { id: 'focus', label: 'Deep focus', detail: '90 min, no notifications' },
  { id: 'move', label: 'Move', detail: 'A short walk after lunch' },
  { id: 'read', label: 'Read', detail: '20 pages before bed' },
];
const selected = ref(goals[0]!.id);
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <DrawerRoot v-model:open="open">
      <DrawerTrigger
        class="inline-flex items-center rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        Set today's goal
      </DrawerTrigger>

      <DrawerPortal>
        <DrawerOverlay class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <DrawerContent
          class="fixed inset-x-0 bottom-0 z-50 mt-24 flex flex-col rounded-t-2xl border-t border-(--border) bg-(--bg-elevated) outline-none"
        >
          <DrawerHandle class="mt-3 mb-1" />

          <div class="mx-auto w-full max-w-md px-5 pb-8 pt-2">
            <DrawerTitle class="text-base font-semibold text-(--fg)">
              Set today's goal
            </DrawerTitle>
            <DrawerDescription class="mt-1 text-sm text-(--fg-muted)">
              Pick one thing to focus on. Drag the handle down to dismiss.
            </DrawerDescription>

            <div class="mt-4 flex flex-col gap-2">
              <button
                v-for="goal in goals"
                :key="goal.id"
                type="button"
                class="flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                :class="selected === goal.id
                  ? 'border-(--accent) bg-(--accent)/10 text-(--fg)'
                  : 'border-(--border) bg-(--bg) text-(--fg) hover:bg-(--bg-subtle)'"
                @click="selected = goal.id"
              >
                <span>
                  <span class="font-medium">{{ goal.label }}</span>
                  <span class="block text-xs text-(--fg-muted)">{{ goal.detail }}</span>
                </span>
                <span
                  v-if="selected === goal.id"
                  class="inline-flex size-5 items-center justify-center rounded-full bg-(--accent) text-(--accent-fg)"
                >
                  <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              </button>
            </div>

            <div class="mt-5 flex justify-end gap-2">
              <DrawerClose
                class="inline-flex items-center rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
                Cancel
              </DrawerClose>
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition-colors hover:bg-(--accent-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
                @click="open = false"
              >
                Save goal
              </button>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </DrawerRoot>
  </div>
</template>
