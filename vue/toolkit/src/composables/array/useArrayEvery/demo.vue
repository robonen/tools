<script setup lang="ts">
import { computed, ref } from 'vue';
import { useArrayEvery } from './index';

interface Check {
  id: number;
  label: string;
  done: boolean;
}

const checklist = ref<Check[]>([
  { id: 1, label: 'Build passes', done: true },
  { id: 2, label: 'Tests green', done: true },
  { id: 3, label: 'Types check', done: false },
  { id: 4, label: 'Docs updated', done: false },
]);

// True only when every item is done.
const allDone = useArrayEvery(checklist, item => item.done);

const completed = computed(() => checklist.value.filter(c => c.done).length);

function toggle(item: Check) {
  item.done = !item.done;
}

function reset() {
  checklist.value.forEach(c => (c.done = false));
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      class="rounded-xl border p-4 transition"
      :class="allDone
        ? 'border-emerald-500/30 bg-emerald-500/10'
        : 'border-(--border) bg-(--bg-elevated)'"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          Release readiness
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
          :class="allDone
            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
        >
          <span
            class="size-2 rounded-full"
            :class="allDone ? 'bg-emerald-500' : 'bg-amber-500'"
          />
          {{ allDone ? 'Ready to ship' : 'Blocked' }}
        </span>
      </div>
      <div class="mt-2 font-mono text-sm tabular-nums text-(--fg-muted)">
        {{ completed }} / {{ checklist.length }} complete
      </div>
    </div>

    <ul class="flex flex-col gap-2">
      <li v-for="item in checklist" :key="item.id">
        <button
          class="flex w-full items-center gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2 text-left text-sm text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.99] cursor-pointer"
          @click="toggle(item)"
        >
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-md border text-xs transition"
            :class="item.done
              ? 'border-transparent bg-(--accent) text-(--accent-fg)'
              : 'border-(--border-strong) text-transparent'"
          >
            ✓
          </span>
          <span :class="item.done ? 'line-through text-(--fg-subtle)' : ''">
            {{ item.label }}
          </span>
        </button>
      </li>
    </ul>

    <button
      class="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
      @click="reset"
    >
      Reset
    </button>
  </div>
</template>
