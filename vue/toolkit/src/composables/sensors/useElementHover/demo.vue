<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useElementHover } from './index';

// Instant hover state.
const instant = useTemplateRef<HTMLElement>('instant');
const isInstantHovered = useElementHover(instant);

// Delayed hover state — debounces flicker on quick passes.
const delayEnter = ref(150);
const delayLeave = ref(400);
const delayed = useTemplateRef<HTMLElement>('delayed');
const isDelayedHovered = useElementHover(delayed, {
  delayEnter: delayEnter.value,
  delayLeave: delayLeave.value,
});
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <!-- Instant: state flips the moment the pointer enters / leaves -->
    <div
      ref="instant"
      class="flex flex-col gap-1 rounded-xl border bg-(--bg-elevated) p-4 transition-all duration-200"
      :class="isInstantHovered
        ? 'border-(--accent) ring-2 ring-(--ring) -translate-y-0.5'
        : 'border-(--border)'"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Instant</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium"
          :class="isInstantHovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
        >
          <span class="size-1.5 rounded-full" :class="isInstantHovered ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ isInstantHovered ? 'hovered' : 'idle' }}
        </span>
      </div>
      <p class="text-sm text-(--fg-muted)">Hover this card to flip the state immediately.</p>
    </div>

    <!-- Delayed: enter/leave delays smooth out flicker -->
    <div
      ref="delayed"
      class="flex flex-col gap-2 rounded-xl border bg-(--bg-elevated) p-4 transition-all duration-200"
      :class="isDelayedHovered
        ? 'border-(--accent) ring-2 ring-(--ring) -translate-y-0.5'
        : 'border-(--border)'"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Delayed</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium"
          :class="isDelayedHovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--fg-muted)'"
        >
          <span class="size-1.5 rounded-full" :class="isDelayedHovered ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
          {{ isDelayedHovered ? 'hovered' : 'idle' }}
        </span>
      </div>
      <p class="text-sm text-(--fg-muted)">
        Waits <span class="font-mono text-(--fg)">{{ delayEnter }}ms</span> to enter,
        <span class="font-mono text-(--fg)">{{ delayLeave }}ms</span> to leave.
      </p>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Enter/leave delays debounce hover flicker — useful for tooltips and submenus that should not vanish the instant you cross a gap.
    </p>
  </div>
</template>
