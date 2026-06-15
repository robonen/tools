<script setup lang="ts">
import { ref, watch } from 'vue';
import { useElementVisibility } from './index';

const root = ref<HTMLElement>();
const target = ref<HTMLElement>();

// controls: true returns { isVisible, isSupported, isActive, pause, resume, stop }.
const { isVisible, isActive, pause, resume } = useElementVisibility(target, {
  controls: true,
  root,
  threshold: 0.5,
});

const seenCount = ref(0);

// Count each time the card crosses into view (rising edge only).
watch(isVisible, (visible, was) => {
  if (visible && !was)
    seenCount.value++;
});
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">IntersectionObserver</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isVisible
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border bg-bg-inset text-fg-muted'"
      >
        <span class="size-1.5 rounded-full" :class="isVisible ? 'bg-emerald-500' : 'bg-fg-subtle'" />
        {{ isVisible ? 'In view' : 'Hidden' }}
      </span>
    </div>

    <!-- Scrollable root; the target card sits below the fold until scrolled. -->
    <div
      ref="root"
      class="h-44 overflow-y-auto rounded-xl border border-border bg-bg-inset p-3"
    >
      <p class="text-sm text-fg-subtle">Scroll down inside this box…</p>
      <div class="h-40" />
      <div
        ref="target"
        class="rounded-lg border border-border bg-accent p-4 text-center text-accent-fg shadow transition"
        :class="isVisible ? 'opacity-100 scale-100' : 'opacity-60 scale-95'"
      >
        <div class="text-sm font-semibold">Target element</div>
        <div class="text-xs opacity-80">at least 50% visible to count</div>
      </div>
      <div class="h-24" />
      <p class="text-sm text-fg-subtle">…and back up to hide it again.</p>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <div class="demo-stat text-3xl">{{ seenCount }}</div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">times seen</div>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center flex flex-col items-center justify-center">
        <div class="text-sm font-semibold" :class="isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-fg-muted'">
          {{ isActive ? 'Active' : 'Paused' }}
        </div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">observer</div>
      </div>
    </div>

    <button
      type="button"
      class="demo-btn"
      @click="isActive ? pause() : resume()"
    >
      {{ isActive ? 'Pause observer' : 'Resume observer' }}
    </button>
  </div>
</template>
