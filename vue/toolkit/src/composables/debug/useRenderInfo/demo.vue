<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRenderInfo } from './index';

// `count` and `duration` are reactive refs; `component` and `lastRendered`
// are captured once at setup (component name/uid and the mount timestamp).
const { component, count, duration, lastRendered } = useRenderInfo();

// Reactive state — mutating it triggers re-renders that update count + duration.
const rows = ref(40);
const grid = computed(() => Array.from({ length: rows.value }, (_, i) => i));

const mountedAt = new Date(lastRendered).toLocaleTimeString();
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="flex items-center justify-between">
      <span class="demo-label">Render info</span>
      <span class="demo-badge">
        {{ component ?? 'anonymous' }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <div class="demo-stat text-3xl">{{ count }}</div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">renders</div>
      </div>
      <div class="rounded-lg border border-border bg-bg-inset p-3 text-center">
        <div class="demo-stat text-3xl">{{ duration.toFixed(2) }}</div>
        <div class="text-[10px] uppercase tracking-wide text-fg-subtle">last render ms</div>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums flex items-center justify-between">
      <span class="text-fg-muted">mounted at</span>
      <span>{{ mountedAt }}</span>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="demo-label" for="rows">Render workload</label>
        <span class="font-mono text-xs tabular-nums text-fg-muted">{{ rows }} cells</span>
      </div>
      <input
        id="rows"
        v-model.number="rows"
        type="range"
        min="1"
        max="400"
        step="1"
        class="w-full accent-accent cursor-pointer"
      >
      <p class="text-xs text-fg-subtle">Drag to re-render a larger DOM subtree and watch the render duration climb.</p>
    </div>

    <div class="grid grid-cols-10 gap-1">
      <span
        v-for="i in grid"
        :key="i"
        class="aspect-square rounded-sm bg-accent-subtle"
      />
    </div>
  </div>
</template>
