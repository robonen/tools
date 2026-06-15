<script setup lang="ts">
import { ref } from 'vue';
import { useTimeout } from './index';

const delay = ref(3000);
const firedAt = ref<string | null>(null);

const { ready, start, stop } = useTimeout(delay, {
  controls: true,
  immediate: false,
  callback: () => {
    firedAt.value = new Date().toLocaleTimeString('en-US', { hour12: false });
  },
});

function restart() {
  firedAt.value = null;
  start();
}

function cancel() {
  stop();
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col items-center gap-3">
      <span class="demo-label">Status</span>

      <div
        class="flex size-20 items-center justify-center rounded-full border-2 transition"
        :class="ready
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-accent bg-accent-subtle text-accent-text'"
      >
        <span class="text-sm font-semibold">{{ ready ? 'Ready' : 'Pending' }}</span>
      </div>

      <p class="text-center text-sm text-fg-muted">
        <template v-if="ready && firedAt">Fired at <span class="font-mono tabular-nums text-fg">{{ firedAt }}</span></template>
        <template v-else-if="ready">Idle — start the timer below</template>
        <template v-else>Counting down… stays pending until the delay elapses</template>
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="demo-label" for="delay">Delay</label>
        <span class="font-mono text-xs tabular-nums text-fg-muted">{{ (delay / 1000).toFixed(1) }}s</span>
      </div>
      <input
        id="delay"
        v-model.number="delay"
        type="range"
        min="500"
        max="5000"
        step="500"
        class="w-full accent-accent cursor-pointer"
      >
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="demo-btn-primary flex-1"
        @click="restart"
      >
        {{ ready ? 'Start' : 'Restart' }}
      </button>
      <button
        type="button"
        :disabled="ready"
        class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="cancel"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
