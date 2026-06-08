<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { useScriptTag } from './index';

// A tiny, well-known public UMD script (no side effects beyond defining a global).
const src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';

const status = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle');
const loadedAt = shallowRef<string | null>(null);

const { scriptTag, load, unload } = useScriptTag(
  src,
  () => {
    status.value = 'loaded';
    loadedAt.value = new Date().toLocaleTimeString();
  },
  { manual: true },
);

async function onLoad() {
  if (status.value === 'loading') return;
  status.value = 'loading';
  try {
    await load();
  }
  catch {
    status.value = 'error';
  }
}

function onUnload() {
  unload();
  status.value = 'idle';
  loadedAt.value = null;
}

const statusStyles = {
  idle: 'border-(--border) bg-(--bg-inset) text-(--fg-muted)',
  loading: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  loaded: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  error: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
} as const;
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Script status
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium capitalize"
          :class="statusStyles[status]"
        >
          <span
            class="size-1.5 rounded-full"
            :class="{
              'bg-(--fg-subtle)': status === 'idle',
              'bg-sky-500 animate-pulse': status === 'loading',
              'bg-emerald-500': status === 'loaded',
              'bg-red-500': status === 'error',
            }"
          />
          {{ status }}
        </span>
      </div>

      <div class="mt-3 truncate rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg-muted)">
        {{ src }}
      </div>

      <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt class="text-xs text-(--fg-subtle)">
            &lt;script&gt; element
          </dt>
          <dd class="font-mono text-(--fg)">
            {{ scriptTag ? 'present' : 'null' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-(--fg-subtle)">
            Loaded at
          </dt>
          <dd class="font-mono text-(--fg)">
            {{ loadedAt ?? '—' }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        :disabled="status === 'loading' || status === 'loaded'"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="onLoad"
      >
        {{ status === 'loading' ? 'Loading…' : 'Load script' }}
      </button>
      <button
        type="button"
        :disabled="status !== 'loaded'"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="onUnload"
      >
        Unload
      </button>
    </div>

    <p class="text-xs leading-relaxed text-(--fg-subtle)">
      Manual mode — the tag is injected into <span class="font-mono text-(--fg-muted)">&lt;head&gt;</span>
      only when you click, and removed on unload.
    </p>
  </div>
</template>
