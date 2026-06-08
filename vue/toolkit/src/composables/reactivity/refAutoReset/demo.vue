<script setup lang="ts">
import { ref } from 'vue';
import { refAutoReset } from './index';

// Reactive delay — the ref resets `delay`ms after the most recent write.
const delay = ref(1500);

// Reverts to 'Idle' once writes stop arriving.
const status = refAutoReset('Idle', delay);
const copied = refAutoReset(false, 1200);

function flash(message: string) {
  status.value = message;
}

async function copy() {
  copied.value = true;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="space-y-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Live value
      </p>
      <div class="flex items-center justify-between rounded-lg border border-(--border) bg-(--bg-inset) p-3">
        <span class="font-mono text-lg font-semibold tabular-nums text-(--fg)">{{ status }}</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
          :class="status === 'Idle'
            ? 'border-(--border) bg-(--bg-elevated) text-(--fg-muted)'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
        >
          {{ status === 'Idle' ? 'reset' : 'active' }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="flash('Saved')"
        >
          Save
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="flash('Synced')"
        >
          Sync
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="flash('Uploading…')"
        >
          Upload
        </button>
      </div>
    </div>

    <label class="flex flex-col gap-1.5 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="flex items-center justify-between text-sm text-(--fg)">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">reset delay</span>
        <span class="font-mono tabular-nums text-(--fg-muted)">{{ delay }}ms</span>
      </span>
      <input
        v-model.number="delay"
        type="range"
        min="500"
        max="4000"
        step="250"
        class="w-full accent-(--accent) cursor-pointer"
      >
    </label>

    <div class="flex items-center justify-between rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <span class="text-sm text-(--fg)">Copy-to-clipboard pattern</span>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="copy"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
  </div>
</template>
