<script setup lang="ts">
import { defineComponent, h, ref } from 'vue';
import { useFocusGuard } from './index';

// useFocusGuard() returns void: on mount it inserts a pair of invisible,
// focusable sentinel elements at the boundaries of the DOM tree. They keep
// focus order consistent (e.g. for modal/overlay focus management) and are
// removed when the last consumer unmounts.

// Mount the guard through a child so we can toggle it on/off in the demo.
const GuardHost = defineComponent({
  name: 'GuardHost',
  setup() {
    useFocusGuard('demo-guard');
    return () => h('span', { class: 'sr-only' }, 'focus guards mounted');
  },
});

const enabled = ref(false);
const focused = ref<string | null>(null);

const fields = [
  { id: 'name', label: 'Name', value: 'Ada Lovelace' },
  { id: 'email', label: 'Email', value: 'ada@analytical.engine' },
];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <component :is="GuardHost" v-if="enabled" />

    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Focus guards</span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="enabled
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span class="size-1.5 rounded-full" :class="enabled ? 'bg-emerald-500' : 'bg-(--fg-subtle)'" />
        {{ enabled ? 'Mounted' : 'Off' }}
      </span>
    </div>

    <!-- A small focusable form to feel tab order with the guards active. -->
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <div v-for="f in fields" :key="f.id" class="flex flex-col gap-1">
        <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" :for="f.id">{{ f.label }}</label>
        <input
          :id="f.id"
          :value="f.value"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          @focus="focused = f.label"
          @blur="focused = null"
        >
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @focus="focused = 'Submit'"
        @blur="focused = null"
      >
        Submit
      </button>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      focused: {{ focused ?? 'nothing' }}
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="enabled = !enabled"
    >
      {{ enabled ? 'Remove focus guards' : 'Mount focus guards' }}
    </button>

    <p class="text-xs text-(--fg-subtle)">
      Guards are invisible <span class="font-mono">tabindex="0"</span> sentinels inserted at the page boundaries. Tab past the last field with them on to feel focus wrap around for overlays and modals.
    </p>
  </div>
</template>
