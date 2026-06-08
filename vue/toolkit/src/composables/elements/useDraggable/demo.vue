<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useDraggable } from './index';

const container = useTemplateRef<HTMLElement>('container');
const handle = useTemplateRef<HTMLElement>('handle');

const { x, y, isDragging, style } = useDraggable(
  useTemplateRef<HTMLElement>('card'),
  {
    initialValue: { x: 24, y: 24 },
    containerElement: container,
    handle,
  },
);
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Draggable, clamped to container
      </span>
      <span
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition"
        :class="isDragging
          ? 'border-(--accent) bg-(--accent-subtle) text-(--accent-text)'
          : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)'"
      >
        <span
          class="size-1.5 rounded-full transition"
          :class="isDragging ? 'bg-(--accent)' : 'bg-(--fg-subtle)'"
        />
        {{ isDragging ? 'dragging' : 'idle' }}
      </span>
    </div>

    <div
      ref="container"
      class="relative h-56 w-full overflow-hidden rounded-xl border border-(--border) bg-(--bg-inset)"
    >
      <div
        ref="card"
        :style="style"
        class="absolute w-36 select-none rounded-lg border border-(--border-strong) bg-(--bg-elevated) shadow-lg"
        :class="isDragging ? 'ring-2 ring-(--ring)' : ''"
      >
        <div
          ref="handle"
          class="flex items-center gap-1.5 rounded-t-lg border-b border-(--border) bg-(--bg-subtle) px-3 py-2 cursor-grab active:cursor-grabbing"
        >
          <span class="text-(--fg-subtle)">⠿</span>
          <span class="text-xs font-medium text-(--fg-muted)">Drag me</span>
        </div>
        <div class="p-3 font-mono text-xs tabular-nums text-(--fg)">
          <div>x: {{ Math.round(x) }}</div>
          <div>y: {{ Math.round(y) }}</div>
        </div>
      </div>
    </div>

    <p class="text-center text-xs text-(--fg-subtle)">
      Drag from the header. Movement is clamped to the container bounds.
    </p>
  </div>
</template>
