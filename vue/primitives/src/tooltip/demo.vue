<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@robonen/primitives';

const actions = [
  {
    label: 'Bold',
    side: 'top' as const,
    path: 'M6 4h7a4 4 0 0 1 0 8H6zm0 8h8a4 4 0 0 1 0 8H6z',
  },
  {
    label: 'Italic',
    side: 'top' as const,
    path: 'M19 4h-9M14 20H5M15 4 9 20',
  },
  {
    label: 'Add link',
    side: 'top' as const,
    path: 'M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  },
];
</script>

<template>
  <!-- A single Provider drives shared open/skip timing for the whole toolbar. -->
  <TooltipProvider :delay-duration="300" :skip-delay-duration="200">
    <div class="flex items-center gap-1 rounded-lg border border-(--border) bg-(--bg-elevated) p-1 text-(--fg)">
      <TooltipRoot v-for="action in actions" :key="action.label">
        <TooltipTrigger
          :aria-label="action.label"
          class="inline-flex size-9 items-center justify-center rounded-md text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=instant-open]:bg-(--bg-subtle) data-[state=delayed-open]:bg-(--bg-subtle)"
        >
          <svg
            class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
          >
            <path :d="action.path" />
          </svg>
        </TooltipTrigger>

        <TooltipPortal>
          <TooltipContent
            :side="action.side"
            :side-offset="6"
            :collision-padding="8"
            class="z-50 select-none rounded-md bg-(--fg) px-2.5 py-1.5 text-xs font-medium text-(--bg) shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out"
          >
            {{ action.label }}
            <TooltipArrow :width="10" :height="5">
              <svg width="10" height="5" viewBox="0 0 10 5" class="block" aria-hidden="true">
                <path d="M0 0 L5 5 L10 0 Z" class="fill-(--fg)" />
              </svg>
            </TooltipArrow>
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>
  </TooltipProvider>
</template>
