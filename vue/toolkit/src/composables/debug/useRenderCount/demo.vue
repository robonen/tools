<script setup lang="ts">
import { ref } from 'vue';
import { useRenderCount } from './index';

// Increments on mount and on every subsequent re-render of this component.
const renderCount = useRenderCount();

// Reactive state — touching any of these triggers a re-render, bumping the count.
const message = ref('Edit me to force a re-render');
const tint = ref(210);

function nudgeTint() {
  tint.value = (tint.value + 40) % 360;
}
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col items-center gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Render count</span>
      <span
        class="font-mono text-3xl font-bold tabular-nums text-(--fg) transition-colors"
        :style="{ color: `hsl(${tint} 70% 55%)` }"
      >{{ renderCount }}</span>
      <span class="text-xs text-(--fg-subtle)">renders since mount</span>
    </div>

    <label class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Bound input</span>
      <input
        v-model="message"
        type="text"
        placeholder="Type to re-render…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <p class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 text-sm text-(--fg)">
      {{ message }}
    </p>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="nudgeTint"
    >
      Force re-render (shift color)
    </button>
  </div>
</template>
