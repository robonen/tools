<script setup lang="ts">
import { VisuallyHidden } from '@robonen/primitives';
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-semibold">
        Icon-only buttons
      </h3>
      <p class="text-sm text-(--fg-muted)">
        Each button shows only an icon, but exposes a real accessible name to screen readers.
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex size-9 items-center justify-center rounded-md border border-(--border) bg-(--bg-subtle) text-(--fg) transition-colors hover:bg-(--bg-inset) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
        @click="count -= 1"
      >
        <span
          aria-hidden="true"
          class="text-base leading-none"
        >&minus;</span>
        <VisuallyHidden>Decrease quantity</VisuallyHidden>
      </button>

      <span class="min-w-8 text-center text-sm font-medium tabular-nums">
        {{ count }}
      </span>

      <button
        type="button"
        class="inline-flex size-9 items-center justify-center rounded-md border border-(--border) bg-(--bg-subtle) text-(--fg) transition-colors hover:bg-(--bg-inset) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
        @click="count += 1"
      >
        <span
          aria-hidden="true"
          class="text-base leading-none"
        >+</span>
        <VisuallyHidden>Increase quantity</VisuallyHidden>
      </button>
    </div>

    <p class="text-sm text-(--fg-subtle)">
      Quantity is now
      <span class="font-medium text-(--fg)">{{ count }}</span>.
      <VisuallyHidden
        as="span"
        aria-live="polite"
      >
        Quantity changed to {{ count }}.
      </VisuallyHidden>
    </p>
  </div>
</template>
