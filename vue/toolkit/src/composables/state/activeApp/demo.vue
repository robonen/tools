<script setup lang="ts">
import { createApp, inject, onUnmounted, reactive, ref } from 'vue';
import type { InjectionKey } from 'vue';
import { runWithApp } from './index';

interface Settings {
  volume: number;
}

const SettingsKey: InjectionKey<Settings> = Symbol('DemoSettings');

// Imagine this is your main.ts: the app provides DI values and is registered
// once with `app.use(activeAppPlugin)`. The demo keeps a standalone app and
// passes it explicitly so it does not touch the docs application.
const app = createApp({ render: () => null });
const settings = reactive<Settings>({ volume: 50 });
app.provide(SettingsKey, settings);

onUnmounted(() => app.unmount());

// A plain module-level function — no setup, no injection context. With
// `runWithApp` it can still resolve `inject()` against the app.
function readVolumeFromOutside() {
  return runWithApp(() => inject(SettingsKey)!.volume, app);
}

const snapshot = ref<number>();
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div class="demo-card p-4 flex flex-col gap-3">
      <span class="demo-label">App-provided state</span>

      <label class="flex items-center gap-3 text-sm text-fg">
        <span class="text-xs text-fg-muted w-14">Volume</span>
        <input
          v-model.number="settings.volume"
          type="range"
          min="0"
          max="100"
          class="flex-1 accent-accent cursor-pointer"
        >
        <span class="font-mono text-xs tabular-nums text-fg-muted w-8 text-right">{{ settings.volume }}</span>
      </label>
    </div>

    <div class="demo-card p-4 flex flex-col gap-3">
      <span class="demo-label">Plain function, outside any component</span>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover active:scale-[0.98] cursor-pointer"
        @click="snapshot = readVolumeFromOutside()"
      >
        runWithApp(() =&gt; inject(SettingsKey))
      </button>

      <p class="font-mono text-xs tabular-nums text-fg-muted">
        {{ snapshot === undefined ? 'not read yet' : `injected volume: ${snapshot}` }}
      </p>
    </div>

    <p class="text-xs text-fg-subtle">
      The function reading the value has no injection context of its own —
      <span class="font-mono text-fg-muted">runWithApp</span> wraps it in
      <span class="font-mono text-fg-muted">app.runWithContext</span> so
      <span class="font-mono text-fg-muted">inject()</span> resolves app-level provides.
    </p>
  </div>
</template>
