<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIntersectionObserver } from './index';

const sections = [
  { id: 'intro', label: 'Introduction', color: 'bg-sky-500' },
  { id: 'install', label: 'Installation', color: 'bg-emerald-500' },
  { id: 'usage', label: 'Usage', color: 'bg-violet-500' },
  { id: 'api', label: 'API Reference', color: 'bg-amber-500' },
];

const root = ref<HTMLElement>();
const itemEls = ref<HTMLElement[]>([]);

// Reactive threshold + rootMargin demonstrate live re-observation.
const threshold = ref(0.5);

// Track which section is currently the most-visible "active" one (scroll-spy).
const ratios = ref<Record<string, number>>({});

useIntersectionObserver(
  itemEls,
  (entries) => {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset.id;
      if (id)
        ratios.value = { ...ratios.value, [id]: entry.intersectionRatio };
    }
  },
  {
    root,
    threshold: () => [0, 0.25, 0.5, 0.75, 1],
  },
);

const activeId = computed(() => {
  let best: string | null = null;
  let bestRatio = threshold.value;
  for (const s of sections) {
    const r = ratios.value[s.id] ?? 0;
    if (r >= bestRatio) {
      bestRatio = r;
      best = s.id;
    }
  }
  return best;
});
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Scroll spy</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        active: {{ activeId ?? '—' }}
      </span>
    </div>

    <div class="flex gap-3">
      <!-- Nav reflects which section dominates the viewport. -->
      <nav class="flex w-32 shrink-0 flex-col gap-1">
        <span
          v-for="s in sections"
          :key="s.id"
          class="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition"
          :class="activeId === s.id
            ? 'border-(--border-strong) bg-(--bg-inset) text-(--fg)'
            : 'border-transparent text-(--fg-muted)'"
        >
          <span class="size-2 rounded-full transition" :class="[s.color, activeId === s.id ? 'opacity-100' : 'opacity-30']" />
          {{ s.label }}
        </span>
      </nav>

      <!-- Scrollable content; each section is an observed target. -->
      <div
        ref="root"
        class="h-56 flex-1 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-inset) p-3 flex flex-col gap-3 scroll-smooth"
      >
        <section
          v-for="s in sections"
          :key="s.id"
          ref="itemEls"
          :data-id="s.id"
          class="rounded-lg border border-(--border) bg-(--bg-elevated) p-4 transition"
          :class="activeId === s.id ? 'ring-2 ring-(--ring)' : ''"
        >
          <h3 class="text-sm font-semibold text-(--fg)">{{ s.label }}</h3>
          <p class="mt-1 text-xs text-(--fg-subtle)">
            Visibility: {{ Math.round((ratios[s.id] ?? 0) * 100) }}%
          </p>
          <div class="mt-2 h-16 rounded bg-(--bg-inset)" />
        </section>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="io-threshold">Active threshold</label>
        <span class="font-mono text-xs tabular-nums text-(--fg-muted)">{{ Math.round(threshold * 100) }}%</span>
      </div>
      <input
        id="io-threshold"
        v-model.number="threshold"
        type="range"
        min="0.1"
        max="0.9"
        step="0.1"
        class="w-full accent-(--accent) cursor-pointer"
      >
      <p class="text-xs text-(--fg-subtle)">A section becomes active once at least this much of it is visible inside the scroll root.</p>
    </div>
  </div>
</template>
