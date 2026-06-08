<script setup lang="ts">
import { computed } from 'vue';
import { usePreferredReducedMotion } from './index';

const motion = usePreferredReducedMotion();

const reduced = computed(() => motion.value === 'reduce');

// Mirror the recommended pattern: derive a transition duration from the
// preference so animations are disabled when the user asks for reduced motion.
const duration = computed(() => (reduced.value ? 0 : 1.2));
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        prefers-reduced-motion
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
        :class="reduced
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
      >
        {{ motion }}
      </span>
    </div>

    <!-- Animated demo box: the orbiting dot pauses when motion is reduced. -->
    <div class="flex h-40 items-center justify-center rounded-xl border border-(--border) bg-(--bg-inset)">
      <div class="relative size-24">
        <div class="absolute inset-0 rounded-full border-2 border-dashed border-(--border-strong)" />
        <div
          class="orbit absolute left-1/2 top-1/2 size-24"
          :style="{ animationDuration: `${duration}s`, animationPlayState: reduced ? 'paused' : 'running' }"
        >
          <span class="absolute -left-2 -top-2 size-4 rounded-full bg-(--accent) shadow-lg" />
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-2xl">{{ reduced ? '⏸' : '🎞️' }}</span>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Derived setting
      </span>
      <div class="mt-1 flex items-baseline gap-2">
        <span class="font-mono text-3xl font-bold tabular-nums text-(--fg)">
          {{ reduced ? 0 : 1200 }}
        </span>
        <span class="text-sm text-(--fg-muted)">ms transition</span>
      </div>
      <p class="mt-2 text-sm text-(--fg-muted)">
        {{ reduced
          ? 'Reduced motion requested — animations are disabled.'
          : 'Full motion — animations run at normal speed.' }}
      </p>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      Read-only: enable "Reduce motion" in your OS accessibility settings to pause the orbit.
    </p>
  </div>
</template>

<style scoped>
.orbit {
  animation-name: spin;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
