<script setup lang="ts">
import { useStateMachine } from './index';

// A media-player transport: the machine makes the button matrix declarative —
// what each control does (and whether it's enabled) follows from the state.
const { state, send, can, matches } = useStateMachine({
  initial: 'stopped',
  states: {
    stopped: { on: { PLAY: 'playing' } },
    playing: { on: { PAUSE: 'paused', STOP: 'stopped' } },
    paused: { on: { PLAY: 'playing', STOP: 'stopped' } },
  },
});
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4">
      <p class="demo-label">
        Media transport
      </p>

      <div class="mt-3 flex items-center gap-3">
        <span
          class="demo-badge"
          :class="matches('playing') ? 'text-emerald-600 dark:text-emerald-400' : ''"
        >
          {{ matches('playing') ? '▶' : matches('paused') ? '⏸' : '⏹' }} {{ state }}
        </span>
      </div>

      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="demo-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!can('PLAY')"
          @click="send('PLAY')"
        >
          Play
        </button>
        <button
          type="button"
          class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!can('PAUSE')"
          @click="send('PAUSE')"
        >
          Pause
        </button>
        <button
          type="button"
          class="demo-btn flex-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!can('STOP')"
          @click="send('STOP')"
        >
          Stop
        </button>
      </div>
    </div>
  </div>
</template>
