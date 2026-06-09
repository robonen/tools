<script setup lang="ts">
import { Toggle } from '@robonen/primitives';
import { computed, ref } from 'vue';

const bold = ref(true);
const italic = ref(false);
const underline = ref(false);

const sampleClass = computed(() => [
  bold.value && 'font-bold',
  italic.value && 'italic',
  underline.value && 'underline',
]);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)">
    <div class="flex items-center gap-1 rounded-lg border border-(--border) bg-(--bg-subtle) p-1">
      <Toggle
        v-model:pressed="bold"
        aria-label="Bold"
        class="inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent font-bold text-(--fg-muted) outline-none transition-colors hover:bg-(--bg-inset) data-[state=on]:bg-(--accent) data-[state=on]:text-(--accent-fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        B
      </Toggle>
      <Toggle
        v-model:pressed="italic"
        aria-label="Italic"
        class="inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent italic text-(--fg-muted) outline-none transition-colors hover:bg-(--bg-inset) data-[state=on]:bg-(--accent) data-[state=on]:text-(--accent-fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        i
      </Toggle>
      <Toggle
        v-model:pressed="underline"
        aria-label="Underline"
        class="inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent underline text-(--fg-muted) outline-none transition-colors hover:bg-(--bg-inset) data-[state=on]:bg-(--accent) data-[state=on]:text-(--accent-fg) focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        U
      </Toggle>

      <div class="mx-1 h-5 w-px bg-(--border)" />

      <Toggle
        disabled
        aria-label="Strikethrough (unavailable)"
        class="inline-flex size-8 items-center justify-center rounded-md border-0 bg-transparent text-(--fg-muted) line-through outline-none transition-colors hover:bg-(--bg-inset) data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
      >
        S
      </Toggle>
    </div>

    <p
      class="min-h-16 rounded-lg bg-(--bg-subtle) px-3 py-2 text-sm text-(--fg)"
      :class="sampleClass"
    >
      The quick brown fox jumps over the lazy dog.
    </p>
  </div>
</template>
