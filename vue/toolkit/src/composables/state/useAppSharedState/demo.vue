<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useAppSharedState } from './index';

// Build one shared store; every consumer that calls useStore() gets the SAME
// reactive object back, so edits in one panel are reflected in the other.
const useStore = useAppSharedState(() => {
  const state = reactive({ likes: 0, lastBy: '—' });
  const like = (by: string) => {
    state.likes++;
    state.lastBy = by;
  };
  return { state, like };
});

// Two independent "components" subscribing to the same shared state.
const alice = useStore();
const bob = useStore();

const total = computed(() => alice.state.likes);
</script>

<template>
  <div class="demo-stack max-w-md">
    <div class="demo-card p-4 flex flex-col items-center gap-1">
      <span class="demo-label">Shared likes</span>
      <span class="demo-stat text-3xl">{{ total }}</span>
      <span class="text-xs text-fg-subtle">last reaction by {{ alice.state.lastBy }}</span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <!-- Consumer A -->
      <div class="demo-card p-4 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="flex size-7 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-text">A</span>
          <span class="text-sm font-medium text-fg">Alice’s panel</span>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3 text-center font-mono text-sm tabular-nums text-fg">
          reads {{ alice.state.likes }}
        </div>
        <button
          type="button"
          class="demo-btn-primary"
          @click="alice.like('Alice')"
        >
          ♥ Like
        </button>
      </div>

      <!-- Consumer B -->
      <div class="demo-card p-4 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="flex size-7 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-text">B</span>
          <span class="text-sm font-medium text-fg">Bob’s panel</span>
        </div>
        <div class="rounded-lg border border-border bg-bg-inset p-3 text-center font-mono text-sm tabular-nums text-fg">
          reads {{ bob.state.likes }}
        </div>
        <button
          type="button"
          class="demo-btn"
          @click="bob.like('Bob')"
        >
          ♥ Like
        </button>
      </div>
    </div>

    <p class="text-xs text-fg-subtle">
      Both panels call <span class="font-mono text-fg-muted">useStore()</span> independently yet share one
      reactive instance — like in either column updates the other instantly.
    </p>
  </div>
</template>
