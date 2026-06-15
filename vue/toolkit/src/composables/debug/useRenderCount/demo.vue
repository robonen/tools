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
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col items-center gap-2">
      <span class="demo-label">Render count</span>
      <span
        class="demo-stat text-3xl transition-colors"
        :style="{ color: `hsl(${tint} 70% 55%)` }"
      >{{ renderCount }}</span>
      <span class="text-xs text-fg-subtle">renders since mount</span>
    </div>

    <label class="flex flex-col gap-1">
      <span class="demo-label">Bound input</span>
      <input
        v-model="message"
        type="text"
        placeholder="Type to re-render…"
        class="demo-input"
      >
    </label>

    <p class="rounded-lg border border-border bg-bg-inset p-3 text-sm text-fg">
      {{ message }}
    </p>

    <button
      type="button"
      class="demo-btn"
      @click="nudgeTint"
    >
      Force re-render (shift color)
    </button>
  </div>
</template>
