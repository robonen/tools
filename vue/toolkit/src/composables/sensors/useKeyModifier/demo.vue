<script setup lang="ts">
import { computed } from 'vue';
import { useKeyModifier } from './index';

// Each call returns a single ShallowRef — bind it directly, do not destructure.
const capsLock = useKeyModifier('CapsLock');
const numLock = useKeyModifier('NumLock');
const shift = useKeyModifier('Shift', { initial: false });
const control = useKeyModifier('Control', { initial: false });
const meta = useKeyModifier('Meta', { initial: false });
const alt = useKeyModifier('Alt', { initial: false });

const lockKeys = computed(() => [
  { label: 'Caps Lock', state: capsLock.value },
  { label: 'Num Lock', state: numLock.value },
]);

const heldKeys = computed(() => [
  { label: 'Shift', state: shift.value },
  { label: 'Control', state: control.value },
  { label: 'Meta', state: meta.value },
  { label: 'Alt', state: alt.value },
]);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <p class="text-sm text-(--fg-muted)">
      Toggle <span class="font-medium text-(--fg)">Caps Lock</span> / <span class="font-medium text-(--fg)">Num Lock</span>,
      or hold a modifier key, then press any key (or click here) to refresh state.
    </p>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Lock keys</span>
      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="key in lockKeys"
          :key="key.label"
          class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition"
          :class="key.state
            ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span class="text-sm font-medium">{{ key.label }}</span>
          <span class="font-mono text-xs tabular-nums">
            {{ key.state === null ? 'null' : key.state ? 'ON' : 'off' }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Held modifiers</span>
      <div class="grid grid-cols-4 gap-2">
        <div
          v-for="key in heldKeys"
          :key="key.label"
          class="flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition"
          :class="key.state
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-subtle)'"
        >
          <span class="text-xs font-medium">{{ key.label }}</span>
          <span
            class="size-2 rounded-full transition"
            :class="key.state ? 'bg-emerald-500' : 'bg-(--border-strong)'"
          />
        </div>
      </div>
    </div>

    <p class="rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 text-xs text-(--fg-subtle)">
      Modifier state is read from <span class="font-mono text-(--fg-muted)">getModifierState</span>, so it stays
      <span class="font-mono text-(--fg-muted)">null</span> until the first matching event arrives.
    </p>
  </div>
</template>
