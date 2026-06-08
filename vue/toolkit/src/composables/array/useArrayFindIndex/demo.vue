<script setup lang="ts">
import { ref } from 'vue';
import { useArrayFindIndex } from './index';

interface Step {
  label: string;
  done: boolean;
}

const steps = ref<Step[]>([
  { label: 'Clone repository', done: true },
  { label: 'Install dependencies', done: true },
  { label: 'Run database migrations', done: false },
  { label: 'Seed sample data', done: false },
  { label: 'Start dev server', done: false },
]);

// Reactive Array.prototype.findIndex — points at the first step still pending.
const nextIndex = useArrayFindIndex(steps, step => !step.done);

function toggle(index: number) {
  steps.value[index]!.done = !steps.value[index]!.done;
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Next pending index
      </p>
      <p class="mt-1 font-mono text-3xl font-bold tabular-nums text-(--fg)">
        {{ nextIndex }}
      </p>
      <p class="mt-1 text-sm text-(--fg-subtle)">
        {{ nextIndex === -1 ? 'All steps complete' : `“${steps[nextIndex]!.label}”` }}
      </p>
    </div>

    <ol class="flex flex-col gap-1.5">
      <li
        v-for="(step, index) in steps"
        :key="step.label"
        class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition"
        :class="index === nextIndex
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg-muted)'"
      >
        <span class="flex items-center gap-2">
          <span class="font-mono text-xs tabular-nums text-(--fg-subtle)">{{ index }}</span>
          <span :class="step.done ? 'line-through opacity-60' : ''">{{ step.label }}</span>
        </span>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
          @click="toggle(index)"
        >
          {{ step.done ? 'Undo' : 'Done' }}
        </button>
      </li>
    </ol>
  </div>
</template>
