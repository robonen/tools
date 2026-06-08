<script setup lang="ts">
import { ref } from 'vue';
import { useColorMode } from './index';

// Scope the applied class/attribute to the demo card so it does not
// fight the docs site's own theme. `emitAuto` keeps the tri-state value.
const target = ref<HTMLElement>();

const mode = useColorMode({
  selector: target,
  attribute: 'data-demo-theme',
  storageKey: null,
  emitAuto: true,
  modes: {
    auto: '',
    light: 'light',
    dark: 'dark',
    sepia: 'sepia',
  },
});

const options = [
  { value: 'auto', label: 'Auto', icon: '◐' },
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
  { value: 'sepia', label: 'Sepia', icon: '✦' },
] as const;
</script>

<template>
  <div
    ref="target"
    class="flex w-full max-w-sm flex-col gap-4"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Color mode</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        system: {{ mode.system.value }}
      </span>
    </div>

    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="inline-flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition active:scale-[0.98] cursor-pointer"
        :class="mode === opt.value
          ? 'border-transparent bg-(--accent) text-(--accent-fg)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
        @click="mode = opt.value"
      >
        <span class="text-base leading-none">{{ opt.icon }}</span>
        {{ opt.label }}
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <p class="mb-3 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Reactive state</p>
      <dl class="space-y-2 text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-(--fg-muted)">selected (emitAuto)</dt>
          <dd class="font-mono tabular-nums text-(--fg)">{{ mode }}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-(--fg-muted)">resolved state</dt>
          <dd class="font-mono tabular-nums text-(--fg)">{{ mode.state.value }}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-(--fg-muted)">store</dt>
          <dd class="font-mono tabular-nums text-(--fg)">{{ mode.store.value }}</dd>
        </div>
      </dl>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      The chosen mode is applied as <code class="font-mono text-(--fg-muted)">data-demo-theme</code> on this card.
      Pick "Auto" to follow your OS preference.
    </p>
  </div>
</template>
