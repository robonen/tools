<script setup lang="ts">
import { useForm } from '../useForm';
import { useFieldArray } from './index';

interface Task {
  title: string;
  done: boolean;
}

// useFieldArray needs a form. We pass it explicitly via the `form` option so
// the demo works as a single self-contained component.
const form = useForm<{ tasks: Task[] }>({
  initialValues: {
    tasks: [
      { title: 'Sketch wireframes', done: true },
      { title: 'Wire up the API', done: false },
      { title: 'Write release notes', done: false },
    ],
  },
});

const { fields, push, remove, move, swap } = useFieldArray<Task>('tasks', { form });

function addTask(): void {
  push({ title: '', done: false });
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Tasks ({{ fields.length }})
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="addTask"
      >
        + Add task
      </button>
    </div>

    <TransitionGroup
      tag="ul"
      class="flex flex-col gap-2"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-150 ease-in absolute"
      leave-to-class="opacity-0 translate-x-2"
    >
      <li
        v-for="(field, index) in fields"
        :key="field.key"
        class="flex items-center gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-2"
      >
        <input
          v-model="field.value.value.done"
          type="checkbox"
          class="size-4 shrink-0 cursor-pointer accent-(--accent)"
          aria-label="Mark done"
        >
        <input
          v-model="field.value.value.title"
          type="text"
          placeholder="Describe the task…"
          class="min-w-0 flex-1 rounded-lg border border-(--border) bg-(--bg) px-3 py-1.5 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
          :class="field.value.value.done ? 'line-through text-(--fg-subtle)' : ''"
        >
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            :disabled="field.isFirst"
            class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.95] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            aria-label="Move up"
            @click="move(index, index - 1)"
          >
            ↑
          </button>
          <button
            type="button"
            :disabled="field.isLast"
            class="inline-flex size-7 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg-muted) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.95] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            aria-label="Move down"
            @click="move(index, index + 1)"
          >
            ↓
          </button>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-600 transition hover:bg-red-500/20 active:scale-[0.95] cursor-pointer dark:text-red-400"
            aria-label="Remove"
            @click="remove(index)"
          >
            ×
          </button>
        </div>
      </li>
    </TransitionGroup>

    <div
      v-if="fields.length === 0"
      class="rounded-xl border border-dashed border-(--border) bg-(--bg-inset) p-6 text-center text-sm text-(--fg-subtle)"
    >
      No tasks yet. Add one to get started.
    </div>

    <div class="flex items-center justify-between border-t border-(--border) pt-3">
      <span class="text-xs text-(--fg-subtle)">
        Stable keys survive reorders
      </span>
      <button
        type="button"
        :disabled="fields.length < 2"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        @click="swap(0, fields.length - 1)"
      >
        Swap first ↔ last
      </button>
    </div>
  </div>
</template>
