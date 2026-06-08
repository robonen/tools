<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMagicKeys } from './index';

// Prevent the browser's own save/find dialogs from stealing the chord.
const keys = useMagicKeys({
  onEventFired(e) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'k'].includes(e.key.toLowerCase()) && e.type === 'keydown')
      e.preventDefault();
  },
});

const { current, reset } = keys;

// Combos are accessed as proxy properties returning ComputedRef<boolean>.
const save = keys['ctrl+s'];
const search = keys['cmd+k'];
const selectAll = keys['ctrl+a'];

const log = ref<string[]>([]);
function fire(action: string) {
  log.value = [`${new Date().toLocaleTimeString(undefined, { hour12: false })} · ${action}`, ...log.value].slice(0, 4);
}

// Each combo computed flips true exactly when the chord completes.
watch(save, v => v && fire('Save (Ctrl+S)'));
watch(search, v => v && fire('Search (Cmd+K)'));
watch(selectAll, v => v && fire('Select all (Ctrl+A)'));

const pressed = computed(() => [...current]);

const combos = computed(() => [
  { label: 'Ctrl + S', active: save.value },
  { label: 'Cmd + K', active: search.value },
  { label: 'Ctrl + A', active: selectAll.value },
]);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <p class="text-sm text-(--fg-muted)">
      Press keys or try a combo — <span class="font-medium text-(--fg)">Ctrl + S</span>,
      <span class="font-medium text-(--fg)">Cmd + K</span>, or
      <span class="font-medium text-(--fg)">Ctrl + A</span>.
    </p>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Currently pressed</span>
        <button
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-2.5 py-1 text-xs font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          :disabled="!pressed.length"
          @click="reset()"
        >
          Reset
        </button>
      </div>

      <div class="mt-3 flex min-h-9 flex-wrap items-center gap-1.5">
        <kbd
          v-for="key in pressed"
          :key="key"
          class="inline-flex min-w-7 items-center justify-center rounded-md border border-(--border-strong) bg-(--bg-inset) px-2 py-1 font-mono text-xs font-semibold text-(--fg) shadow-sm"
        >
          {{ key === ' ' ? 'Space' : key }}
        </kbd>
        <span v-if="!pressed.length" class="text-sm text-(--fg-subtle)">No keys held</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="combo in combos"
        :key="combo.label"
        class="flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center text-xs font-medium transition"
        :class="combo.active
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        {{ combo.label }}
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-xs text-(--fg) tabular-nums">
      <div class="mb-1.5 text-(--fg-subtle)">Triggered actions</div>
      <ul v-if="log.length" class="flex flex-col gap-0.5">
        <li v-for="entry in log" :key="entry" class="text-(--fg-muted)">{{ entry }}</li>
      </ul>
      <span v-else class="text-(--fg-subtle)">Waiting for a chord…</span>
    </div>
  </div>
</template>
