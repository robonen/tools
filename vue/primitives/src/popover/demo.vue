<script setup lang="ts">
import { reactive } from 'vue';
import {
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from '@robonen/primitives';

const dimensions = reactive({
  width: 320,
  height: 180,
  maxWidth: 480,
  maxHeight: 280,
});

const fields = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'maxWidth', label: 'Max. width' },
  { key: 'maxHeight', label: 'Max. height' },
] as const;
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <div
      class="rounded-md border border-dashed border-(--border) bg-(--bg-subtle) text-xs text-(--fg-muted)"
      :style="{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }"
    >
      <span class="block px-2 py-1">{{ dimensions.width }} × {{ dimensions.height }}</span>
    </div>

    <PopoverRoot>
      <PopoverTrigger
        class="inline-flex items-center gap-2 rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=open]:bg-(--bg-subtle)"
      >
        <svg
          class="size-4 text-(--fg-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Dimensions
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          :side-offset="8"
          align="start"
          :collision-padding="8"
          class="z-50 w-64 rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-(--fg) shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-semibold">Dimensions</h3>
              <p class="mt-0.5 text-xs text-(--fg-muted)">Set the box size in pixels.</p>
            </div>
            <PopoverClose
              aria-label="Close"
              class="-mr-1 -mt-1 inline-flex size-6 items-center justify-center rounded-md text-(--fg-muted) transition-colors hover:bg-(--bg-subtle) hover:text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
            >
              <svg
                class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </PopoverClose>
          </div>

          <div class="mt-3 flex flex-col gap-2">
            <label
              v-for="field in fields"
              :key="field.key"
              class="grid grid-cols-[1fr_auto] items-center gap-3 text-sm"
            >
              <span class="text-(--fg-muted)">{{ field.label }}</span>
              <input
                v-model.number="dimensions[field.key]"
                type="number"
                class="h-7 w-20 rounded-md border border-(--border) bg-(--bg) px-2 text-right tabular-nums text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
              >
            </label>
          </div>

          <PopoverArrow :width="12" :height="6">
            <svg width="12" height="6" viewBox="0 0 12 6" class="block" aria-hidden="true">
              <path d="M0 0 L6 6 L12 0 Z" class="fill-(--bg-elevated) stroke-(--border)" stroke-width="1" />
            </svg>
          </PopoverArrow>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
